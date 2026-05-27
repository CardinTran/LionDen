import { Events, type Client } from "discord.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockEnsureBotGuildConfig = vi.fn();
const mockStartPracticeScheduler = vi.fn();
const mockStartRedEnvelopeScheduler = vi.fn();
const mockStartLionSpawnScheduler = vi.fn();
const mockStartHouseRecapScheduler = vi.fn();
const mockApplyBotPresence = vi.fn();
const mockLoggerInfo = vi.fn();
const mockLoggerError = vi.fn();

vi.mock("../src/features/admin/bot-config.service.js", () => ({
  ensureBotGuildConfig: mockEnsureBotGuildConfig
}));

vi.mock("../src/features/practice/practice-scheduler.js", () => ({
  startPracticeScheduler: mockStartPracticeScheduler
}));

vi.mock("../src/features/economy/red-envelope-scheduler.js", () => ({
  startRedEnvelopeScheduler: mockStartRedEnvelopeScheduler
}));

vi.mock("../src/features/lions/lion-spawn-scheduler.js", () => ({
  startLionSpawnScheduler: mockStartLionSpawnScheduler
}));

vi.mock("../src/features/houses/house-recap-scheduler.js", () => ({
  startHouseRecapScheduler: mockStartHouseRecapScheduler
}));

vi.mock("../src/bot/presence.js", () => ({
  applyBotPresence: mockApplyBotPresence
}));

vi.mock("../src/lib/logger.js", () => ({
  logger: {
    info: mockLoggerInfo,
    error: mockLoggerError
  }
}));

vi.mock("../src/lib/prisma.js", () => ({
  prisma: {}
}));

vi.mock("../src/config/env.js", () => ({
  env: {
    DISCORD_GUILD_ID: "guild_123"
  }
}));

const { registerReadyEvent } = await import("../src/bot/events/ready.js");

type StoredListener = (payload: unknown) => unknown;

const createFakeClient = () => {
  const listeners = new Map<string, StoredListener>();
  const client = {
    once: vi.fn((event: string, handler: StoredListener) => {
      listeners.set(event, handler);
    })
  } as unknown as Client;

  return {
    client,
    listeners
  };
};

describe("ready event routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnsureBotGuildConfig.mockResolvedValue({
      guildId: "guild_123",
      maintenanceMode: false
    });
  });

  it("registers a ClientReady listener", () => {
    const { client } = createFakeClient();

    registerReadyEvent(client);

    expect(client.once).toHaveBeenCalledWith(
      Events.ClientReady,
      expect.any(Function)
    );
  });

  it("logs readiness and starts runtime schedulers", async () => {
    const { client, listeners } = createFakeClient();

    registerReadyEvent(client);
    listeners.get(Events.ClientReady)?.({
      user: {
        tag: "LionDen#0000"
      }
    });

    await vi.waitFor(() => {
      expect(mockEnsureBotGuildConfig).toHaveBeenCalledWith(
        {},
        {
          guildId: "guild_123"
        }
      );
      expect(mockApplyBotPresence).toHaveBeenCalledWith(client, {
        guildId: "guild_123",
        maintenanceMode: false
      });
      expect(mockStartPracticeScheduler).toHaveBeenCalledWith(client);
      expect(mockStartRedEnvelopeScheduler).toHaveBeenCalledWith(client);
      expect(mockStartLionSpawnScheduler).toHaveBeenCalledWith(client);
      expect(mockStartHouseRecapScheduler).toHaveBeenCalledWith(client);
    });

    expect(mockLoggerInfo).toHaveBeenCalledWith("Discord client ready", {
      tag: "LionDen#0000"
    });
  });

  it("logs runtime initialization errors instead of throwing", async () => {
    const error = new Error("database unavailable");
    const { client, listeners } = createFakeClient();
    mockEnsureBotGuildConfig.mockRejectedValue(error);

    registerReadyEvent(client);
    listeners.get(Events.ClientReady)?.({
      user: {
        tag: "LionDen#0000"
      }
    });

    await vi.waitFor(() => {
      expect(mockLoggerError).toHaveBeenCalledWith(
        "Failed to initialize bot runtime controls",
        {
          error
        }
      );
    });
    expect(mockStartPracticeScheduler).not.toHaveBeenCalled();
    expect(mockStartRedEnvelopeScheduler).not.toHaveBeenCalled();
    expect(mockStartLionSpawnScheduler).not.toHaveBeenCalled();
    expect(mockStartHouseRecapScheduler).not.toHaveBeenCalled();
  });
});

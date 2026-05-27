import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Message } from "discord.js";

import type { LionMessageCommandContext } from "../src/bot/messages/lions/types.js";

const mockFeedLion = vi.fn();
const mockGetLionBondStatus = vi.fn();
const mockGroomLion = vi.fn();
const mockFormatLionBondStatusMessage = vi.fn();
const mockFormatLionCareResultMessage = vi.fn();

vi.mock("../src/lib/prisma.js", () => ({
  prisma: {}
}));

vi.mock("../src/features/lions/lion-bond.service.js", () => ({
  feedLion: mockFeedLion,
  getLionBondStatus: mockGetLionBondStatus,
  groomLion: mockGroomLion
}));

vi.mock("../src/features/lions/lion-bond-formatting.js", () => ({
  formatLionBondStatusMessage: mockFormatLionBondStatusMessage,
  formatLionCareResultMessage: mockFormatLionCareResultMessage
}));

const { handleBondLionMessage } = await import(
  "../src/bot/messages/lions/bond.handler.js"
);

const now = new Date("2026-05-27T12:00:00.000Z");

const createMessage = (): Message =>
  ({
    guildId: "guild_123",
    createdAt: now,
    author: {
      id: "user_123",
      username: "Mira"
    },
    reply: vi.fn()
  }) as unknown as Message;

const createContext = (
  input: Pick<LionMessageCommandContext, "normalizedCommand" | "args">
): LionMessageCommandContext => ({
  message: createMessage(),
  guildId: "guild_123",
  normalizedCommand: input.normalizedCommand,
  args: input.args
});

describe("lion bond message handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFormatLionBondStatusMessage.mockReturnValue("bond status");
    mockFormatLionCareResultMessage.mockReturnValue("care result");
  });

  it("routes ~bond to bond status and preserves multi-word queries", async () => {
    const result = {
      outcome: "status"
    };
    const context = createContext({
      normalizedCommand: "~bond",
      args: ["Lucky", "Lion"]
    });
    mockGetLionBondStatus.mockResolvedValue(result);

    await expect(handleBondLionMessage(context)).resolves.toBe(true);

    expect(mockGetLionBondStatus).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        userId: "user_123",
        query: "Lucky Lion"
      }
    );
    expect(mockFormatLionBondStatusMessage).toHaveBeenCalledWith(result, now);
    expect(context.message.reply).toHaveBeenCalledWith("bond status");
  });

  it("routes ~bond without arguments for favorite-lion status", async () => {
    const result = {
      outcome: "no_favorite"
    };
    const context = createContext({
      normalizedCommand: "~bond",
      args: []
    });
    mockGetLionBondStatus.mockResolvedValue(result);

    await expect(handleBondLionMessage(context)).resolves.toBe(true);

    expect(mockGetLionBondStatus).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        query: ""
      })
    );
    expect(context.message.reply).toHaveBeenCalledWith("bond status");
  });

  it("routes ~feed to the feed care action", async () => {
    const result = {
      outcome: "cared",
      action: "feed"
    };
    const context = createContext({
      normalizedCommand: "~feed",
      args: ["Thunder"]
    });
    mockFeedLion.mockResolvedValue(result);

    await expect(handleBondLionMessage(context)).resolves.toBe(true);

    expect(mockFeedLion).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        userId: "user_123",
        query: "Thunder",
        now
      }
    );
    expect(mockFormatLionCareResultMessage).toHaveBeenCalledWith(result, now);
    expect(context.message.reply).toHaveBeenCalledWith("care result");
  });

  it("routes ~groom to the groom care action", async () => {
    const result = {
      outcome: "on_cooldown",
      action: "groom"
    };
    const context = createContext({
      normalizedCommand: "~groom",
      args: []
    });
    mockGroomLion.mockResolvedValue(result);

    await expect(handleBondLionMessage(context)).resolves.toBe(true);

    expect(mockGroomLion).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        userId: "user_123",
        query: "",
        now
      }
    );
    expect(context.message.reply).toHaveBeenCalledWith("care result");
  });

  it("ignores unrelated lion commands", async () => {
    const context = createContext({
      normalizedCommand: "~showcase",
      args: []
    });

    await expect(handleBondLionMessage(context)).resolves.toBe(false);

    expect(mockGetLionBondStatus).not.toHaveBeenCalled();
    expect(mockFeedLion).not.toHaveBeenCalled();
    expect(mockGroomLion).not.toHaveBeenCalled();
    expect(context.message.reply).not.toHaveBeenCalled();
  });
});

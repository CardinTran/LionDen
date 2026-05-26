import { Events, PermissionFlagsBits, type Client } from "discord.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetBotGuildConfig = vi.fn();
const mockFormatMaintenanceNotice = vi.fn(() => "LionDen is in maintenance.");
const mockCommandRegistryGet = vi.fn();
const mockHandlePracticeButton = vi.fn();
const mockIsPracticeButtonCustomId = vi.fn();
const mockHandleLionDuelButton = vi.fn();
const mockIsLionDuelButtonCustomId = vi.fn();
const mockLoggerWarn = vi.fn();
const mockLoggerError = vi.fn();

vi.mock("../src/features/admin/bot-config.service.js", () => ({
  getBotGuildConfig: mockGetBotGuildConfig,
  formatMaintenanceNotice: mockFormatMaintenanceNotice
}));

vi.mock("../src/bot/commands/index.js", () => ({
  commandRegistry: {
    get: mockCommandRegistryGet
  }
}));

vi.mock("../src/bot/commands/practice.js", () => ({
  handlePracticeButton: mockHandlePracticeButton,
  isPracticeButtonCustomId: mockIsPracticeButtonCustomId
}));

vi.mock("../src/bot/messages/lions/duel.handler.js", () => ({
  handleLionDuelButton: mockHandleLionDuelButton,
  isLionDuelButtonCustomId: mockIsLionDuelButtonCustomId
}));

vi.mock("../src/lib/logger.js", () => ({
  logger: {
    warn: mockLoggerWarn,
    error: mockLoggerError
  }
}));

vi.mock("../src/lib/prisma.js", () => ({
  prisma: {}
}));

const { registerInteractionCreateEvent } =
  await import("../src/bot/events/interactionCreate.js");

type StoredListener = (payload: unknown) => unknown | Promise<unknown>;

const createFakeClient = () => {
  const listeners = new Map<string, StoredListener>();
  const client = {
    on: vi.fn((event: string, handler: StoredListener) => {
      listeners.set(event, handler);
    })
  } as unknown as Client;

  return {
    client,
    emitStored: async (event: string, payload: unknown) => {
      await listeners.get(event)?.(payload);
    }
  };
};

const createPermissions = (allowed: boolean) => ({
  has: vi.fn((permission: bigint) => {
    expect(permission).toBe(PermissionFlagsBits.ManageGuild);
    return allowed;
  })
});

const createFakeInteraction = (
  overrides: Partial<{
    guildId: string | null;
    commandName: string;
    customId: string;
    isButton: boolean;
    isChatInputCommand: boolean;
    isRepliable: boolean;
    replied: boolean;
    deferred: boolean;
    canManageGuild: boolean;
  }> = {}
) => {
  const settings = {
    guildId: null,
    commandName: "ping",
    customId: "",
    isButton: false,
    isChatInputCommand: false,
    isRepliable: true,
    replied: false,
    deferred: false,
    canManageGuild: false,
    ...overrides
  };

  return {
    guildId: settings.guildId,
    commandName: settings.commandName,
    customId: settings.customId,
    replied: settings.replied,
    deferred: settings.deferred,
    memberPermissions: createPermissions(settings.canManageGuild),
    isButton: vi.fn(() => settings.isButton),
    isChatInputCommand: vi.fn(() => settings.isChatInputCommand),
    isRepliable: vi.fn(() => settings.isRepliable),
    reply: vi.fn(),
    followUp: vi.fn()
  };
};

describe("interactionCreate event routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBotGuildConfig.mockResolvedValue(null);
    mockCommandRegistryGet.mockReturnValue(undefined);
    mockHandlePracticeButton.mockResolvedValue(undefined);
    mockIsPracticeButtonCustomId.mockReturnValue(false);
    mockHandleLionDuelButton.mockResolvedValue(undefined);
    mockIsLionDuelButtonCustomId.mockReturnValue(false);
  });

  it("ignores interactions that are not commands or practice buttons", async () => {
    const { client, emitStored } = createFakeClient();
    const interaction = createFakeInteraction();

    registerInteractionCreateEvent(client);
    await emitStored(Events.InteractionCreate, interaction);

    expect(mockCommandRegistryGet).not.toHaveBeenCalled();
    expect(mockHandlePracticeButton).not.toHaveBeenCalled();
    expect(interaction.reply).not.toHaveBeenCalled();
  });

  it("logs and ignores unknown slash commands", async () => {
    const { client, emitStored } = createFakeClient();
    const interaction = createFakeInteraction({
      commandName: "missing",
      isChatInputCommand: true
    });

    registerInteractionCreateEvent(client);
    await emitStored(Events.InteractionCreate, interaction);

    expect(mockLoggerWarn).toHaveBeenCalledWith("Received unknown command", {
      commandName: "missing"
    });
    expect(interaction.reply).not.toHaveBeenCalled();
  });

  it("dispatches known slash commands", async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const { client, emitStored } = createFakeClient();
    const interaction = createFakeInteraction({
      guildId: "guild_123",
      commandName: "ping",
      isChatInputCommand: true
    });
    mockCommandRegistryGet.mockReturnValue({
      execute
    });

    registerInteractionCreateEvent(client);
    await emitStored(Events.InteractionCreate, interaction);

    expect(mockGetBotGuildConfig).toHaveBeenCalledWith({}, "guild_123");
    expect(execute).toHaveBeenCalledWith(interaction);
  });

  it("replies ephemerally when command execution fails before a response", async () => {
    const error = new Error("command failed");
    const execute = vi.fn().mockRejectedValue(error);
    const { client, emitStored } = createFakeClient();
    const interaction = createFakeInteraction({
      commandName: "ping",
      isChatInputCommand: true
    });
    mockCommandRegistryGet.mockReturnValue({
      execute
    });

    registerInteractionCreateEvent(client);
    await emitStored(Events.InteractionCreate, interaction);

    expect(mockLoggerError).toHaveBeenCalledWith("Command execution failed", {
      commandName: "ping",
      error
    });
    expect(interaction.reply).toHaveBeenCalledWith({
      content: "Something went wrong while running that command.",
      ephemeral: true
    });
    expect(interaction.followUp).not.toHaveBeenCalled();
  });

  it("follows up when command execution fails after a response", async () => {
    const execute = vi.fn().mockRejectedValue(new Error("command failed"));
    const { client, emitStored } = createFakeClient();
    const interaction = createFakeInteraction({
      commandName: "ping",
      deferred: true,
      isChatInputCommand: true
    });
    mockCommandRegistryGet.mockReturnValue({
      execute
    });

    registerInteractionCreateEvent(client);
    await emitStored(Events.InteractionCreate, interaction);

    expect(interaction.followUp).toHaveBeenCalledWith({
      content: "Something went wrong while running that command.",
      ephemeral: true
    });
    expect(interaction.reply).not.toHaveBeenCalled();
  });

  it("blocks non-admin interactions during maintenance mode", async () => {
    const { client, emitStored } = createFakeClient();
    const interaction = createFakeInteraction({
      guildId: "guild_123",
      isChatInputCommand: true
    });
    mockGetBotGuildConfig.mockResolvedValue({
      maintenanceMode: true
    });

    registerInteractionCreateEvent(client);
    await emitStored(Events.InteractionCreate, interaction);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: "LionDen is in maintenance.",
      ephemeral: true
    });
    expect(mockCommandRegistryGet).not.toHaveBeenCalled();
  });

  it("allows Manage Guild users during maintenance mode", async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const { client, emitStored } = createFakeClient();
    const interaction = createFakeInteraction({
      guildId: "guild_123",
      canManageGuild: true,
      commandName: "ping",
      isChatInputCommand: true
    });
    mockGetBotGuildConfig.mockResolvedValue({
      maintenanceMode: true
    });
    mockCommandRegistryGet.mockReturnValue({
      execute
    });

    registerInteractionCreateEvent(client);
    await emitStored(Events.InteractionCreate, interaction);

    expect(execute).toHaveBeenCalledWith(interaction);
    expect(interaction.reply).not.toHaveBeenCalled();
  });

  it("routes practice button interactions", async () => {
    const { client, emitStored } = createFakeClient();
    const interaction = createFakeInteraction({
      customId: "practice:rsvp:GOING:session_123",
      isButton: true
    });
    mockIsPracticeButtonCustomId.mockReturnValue(true);

    registerInteractionCreateEvent(client);
    await emitStored(Events.InteractionCreate, interaction);

    expect(mockHandlePracticeButton).toHaveBeenCalledWith(interaction);
    expect(mockCommandRegistryGet).not.toHaveBeenCalled();
  });

  it("routes lion duel button interactions", async () => {
    const { client, emitStored } = createFakeClient();
    const interaction = createFakeInteraction({
      customId: "lionduel:duel_123:basic",
      isButton: true
    });
    mockIsLionDuelButtonCustomId.mockReturnValue(true);

    registerInteractionCreateEvent(client);
    await emitStored(Events.InteractionCreate, interaction);

    expect(mockHandleLionDuelButton).toHaveBeenCalledWith(interaction);
    expect(mockHandlePracticeButton).not.toHaveBeenCalled();
    expect(mockCommandRegistryGet).not.toHaveBeenCalled();
  });

  it("replies ephemerally when a lion duel button handler fails", async () => {
    const error = new Error("duel failed");
    const { client, emitStored } = createFakeClient();
    const interaction = createFakeInteraction({
      customId: "lionduel:duel_123:basic",
      isButton: true
    });
    mockIsLionDuelButtonCustomId.mockReturnValue(true);
    mockHandleLionDuelButton.mockRejectedValue(error);

    registerInteractionCreateEvent(client);
    await emitStored(Events.InteractionCreate, interaction);

    expect(mockLoggerError).toHaveBeenCalledWith(
      "Lion duel interaction failed",
      {
        customId: "lionduel:duel_123:basic",
        error
      }
    );
    expect(interaction.reply).toHaveBeenCalledWith({
      content: "Something went wrong while updating that lion duel.",
      ephemeral: true
    });
  });

  it("replies ephemerally when a practice button handler fails", async () => {
    const error = new Error("practice failed");
    const { client, emitStored } = createFakeClient();
    const interaction = createFakeInteraction({
      customId: "practice:rsvp:GOING:session_123",
      isButton: true
    });
    mockIsPracticeButtonCustomId.mockReturnValue(true);
    mockHandlePracticeButton.mockRejectedValue(error);

    registerInteractionCreateEvent(client);
    await emitStored(Events.InteractionCreate, interaction);

    expect(mockLoggerError).toHaveBeenCalledWith(
      "Practice interaction failed",
      {
        customId: "practice:rsvp:GOING:session_123",
        error
      }
    );
    expect(interaction.reply).toHaveBeenCalledWith({
      content: "Something went wrong while recording that practice check-in.",
      ephemeral: true
    });
  });
});

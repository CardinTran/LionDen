import { Events, PermissionFlagsBits, type Client } from "discord.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetBotGuildConfig = vi.fn();
const mockFormatMaintenanceNotice = vi.fn(() => "LionDen is in maintenance.");
const mockGetOpenRedEnvelopeForChannel = vi.fn();
const mockClaimRedEnvelope = vi.fn();
const mockRecordChannelActivity = vi.fn();
const mockAwardMessageXp = vi.fn();
const mockHandleLionCreatureMessage = vi.fn();
const mockRecordWeeklyChallengeProgressSafely = vi.fn();
const mockRecordRedEnvelopeClaimHousePointsSafely = vi.fn();
const mockLoggerError = vi.fn();

vi.mock("../src/features/admin/bot-config.service.js", () => ({
  getBotGuildConfig: mockGetBotGuildConfig,
  formatMaintenanceNotice: mockFormatMaintenanceNotice
}));

vi.mock("../src/features/economy/red-envelope.service.js", () => ({
  getOpenRedEnvelopeForChannel: mockGetOpenRedEnvelopeForChannel,
  claimRedEnvelope: mockClaimRedEnvelope
}));

vi.mock("../src/features/economy/channel-activity.service.js", () => ({
  recordChannelActivity: mockRecordChannelActivity
}));

vi.mock("../src/features/progression/message-xp.service.js", () => ({
  awardMessageXp: mockAwardMessageXp
}));

vi.mock("../src/bot/messages/lion-creatures.js", () => ({
  handleLionCreatureMessage: mockHandleLionCreatureMessage
}));

vi.mock("../src/features/challenges/weekly-challenge-hooks.js", () => ({
  recordWeeklyChallengeProgressSafely: mockRecordWeeklyChallengeProgressSafely
}));

vi.mock("../src/features/houses/house-hooks.js", () => ({
  recordRedEnvelopeClaimHousePointsSafely:
    mockRecordRedEnvelopeClaimHousePointsSafely
}));

vi.mock("../src/bot/commands/redenvelope.js", () => ({
  RED_ENVELOPE_GRAB_COMMAND: "~grab",
  formatRedEnvelopeAlreadyClaimedMessage: vi.fn(() => "Already claimed."),
  formatRedEnvelopeClaimSuccessMessage: vi.fn(() => "Claim success."),
  formatRedEnvelopeClaimedMessage: vi.fn(() => "Envelope claimed.")
}));

vi.mock("../src/lib/logger.js", () => ({
  logger: {
    error: mockLoggerError
  }
}));

vi.mock("../src/lib/prisma.js", () => ({
  prisma: {}
}));

const { registerMessageCreateEvent } =
  await import("../src/bot/events/messageCreate.js");

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

const createMessagePermissions = (allowed: boolean) => ({
  has: vi.fn((permission: bigint) => {
    expect(permission).toBe(PermissionFlagsBits.ManageGuild);
    return allowed;
  })
});

const createdAt = new Date("2026-05-24T12:00:00.000Z");

const createFakeMessage = (
  overrides: Partial<{
    authorBot: boolean;
    guildId: string | null;
    content: string;
    canManageGuild: boolean;
  }> = {}
) => {
  const settings = {
    authorBot: false,
    guildId: "guild_123",
    content: "hello team",
    canManageGuild: false,
    ...overrides
  };
  const channelSend = vi.fn();

  return {
    author: {
      bot: settings.authorBot,
      id: "user_123",
      username: "Mira"
    },
    guildId: settings.guildId,
    channelId: "channel_123",
    content: settings.content,
    createdAt,
    member: {
      user: {
        username: "Mira"
      },
      permissions: createMessagePermissions(settings.canManageGuild)
    },
    channel: {
      isTextBased: vi.fn(() => true),
      send: channelSend
    },
    reply: vi.fn()
  };
};

describe("messageCreate event routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBotGuildConfig.mockResolvedValue(null);
    mockGetOpenRedEnvelopeForChannel.mockResolvedValue(null);
    mockClaimRedEnvelope.mockResolvedValue({
      outcome: "claimed",
      envelope: null
    });
    mockRecordWeeklyChallengeProgressSafely.mockResolvedValue(undefined);
    mockRecordRedEnvelopeClaimHousePointsSafely.mockResolvedValue(undefined);
    mockAwardMessageXp.mockResolvedValue(undefined);
    mockHandleLionCreatureMessage.mockResolvedValue(false);
  });

  it("ignores bot messages", async () => {
    const { client, emitStored } = createFakeClient();
    const message = createFakeMessage({
      authorBot: true
    });

    registerMessageCreateEvent(client);
    await emitStored(Events.MessageCreate, message);

    expect(mockGetBotGuildConfig).not.toHaveBeenCalled();
    expect(mockAwardMessageXp).not.toHaveBeenCalled();
  });

  it("ignores non-guild messages", async () => {
    const { client, emitStored } = createFakeClient();
    const message = createFakeMessage({
      guildId: null
    });

    registerMessageCreateEvent(client);
    await emitStored(Events.MessageCreate, message);

    expect(mockGetBotGuildConfig).not.toHaveBeenCalled();
    expect(mockAwardMessageXp).not.toHaveBeenCalled();
  });

  it("records activity and awards XP for normal guild messages", async () => {
    const { client, emitStored } = createFakeClient();
    const message = createFakeMessage();

    registerMessageCreateEvent(client);
    await emitStored(Events.MessageCreate, message);

    expect(mockHandleLionCreatureMessage).toHaveBeenCalledWith(message);
    expect(mockRecordChannelActivity).toHaveBeenCalledWith({
      guildId: "guild_123",
      channelId: "channel_123",
      occurredAt: createdAt
    });
    expect(mockAwardMessageXp).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        userId: "user_123",
        displayName: "Mira",
        awardedAt: createdAt
      }
    );
  });

  it("routes ~grab to the red envelope claim handler", async () => {
    const { client, emitStored } = createFakeClient();
    const message = createFakeMessage({
      content: "  ~GRAB  "
    });
    const envelope = {
      id: "envelope_123"
    };
    mockGetOpenRedEnvelopeForChannel.mockResolvedValue(envelope);
    mockClaimRedEnvelope.mockResolvedValue({
      outcome: "claimed",
      envelope
    });

    registerMessageCreateEvent(client);
    await emitStored(Events.MessageCreate, message);

    expect(mockGetOpenRedEnvelopeForChannel).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        channelId: "channel_123"
      }
    );
    expect(mockClaimRedEnvelope).toHaveBeenCalledWith(
      {},
      {
        envelopeId: "envelope_123",
        userId: "user_123",
        displayName: "Mira",
        claimedAt: createdAt
      }
    );
    expect(mockRecordWeeklyChallengeProgressSafely).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        userId: "user_123",
        displayName: "Mira",
        activityType: "RED_ENVELOPE_CLAIM",
        occurredAt: createdAt
      }
    );
    expect(mockRecordRedEnvelopeClaimHousePointsSafely).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        userId: "user_123",
        redEnvelopeId: "envelope_123"
      }
    );
    expect(message.channel.send).toHaveBeenCalledWith("Envelope claimed.");
    expect(message.reply).toHaveBeenCalledWith("Claim success.");
    expect(mockHandleLionCreatureMessage).not.toHaveBeenCalled();
    expect(mockAwardMessageXp).not.toHaveBeenCalled();
  });

  it("does not record House points when a red envelope claim is already claimed", async () => {
    const { client, emitStored } = createFakeClient();
    const message = createFakeMessage({
      content: "~grab"
    });
    const envelope = {
      id: "envelope_123"
    };
    mockGetOpenRedEnvelopeForChannel.mockResolvedValue(envelope);
    mockClaimRedEnvelope.mockResolvedValue({
      outcome: "already_claimed",
      envelope
    });

    registerMessageCreateEvent(client);
    await emitStored(Events.MessageCreate, message);

    expect(mockRecordRedEnvelopeClaimHousePointsSafely).not.toHaveBeenCalled();
    expect(message.reply).toHaveBeenCalledWith("Already claimed.");
  });

  it("routes lion text commands and skips fallback handling when handled", async () => {
    const { client, emitStored } = createFakeClient();
    const message = createFakeMessage({
      content: "~lions"
    });
    mockHandleLionCreatureMessage.mockResolvedValue(true);

    registerMessageCreateEvent(client);
    await emitStored(Events.MessageCreate, message);

    expect(mockHandleLionCreatureMessage).toHaveBeenCalledWith(message);
    expect(mockRecordChannelActivity).not.toHaveBeenCalled();
    expect(mockAwardMessageXp).not.toHaveBeenCalled();
  });

  it("blocks normal users during maintenance mode", async () => {
    const { client, emitStored } = createFakeClient();
    const message = createFakeMessage({
      content: "~lions"
    });
    mockGetBotGuildConfig.mockResolvedValue({
      maintenanceMode: true
    });

    registerMessageCreateEvent(client);
    await emitStored(Events.MessageCreate, message);

    expect(message.reply).toHaveBeenCalledWith("LionDen is in maintenance.");
    expect(mockHandleLionCreatureMessage).not.toHaveBeenCalled();
    expect(mockAwardMessageXp).not.toHaveBeenCalled();
  });

  it("allows Manage Guild users during maintenance mode", async () => {
    const { client, emitStored } = createFakeClient();
    const message = createFakeMessage({
      canManageGuild: true,
      content: "hello team"
    });
    mockGetBotGuildConfig.mockResolvedValue({
      maintenanceMode: true
    });

    registerMessageCreateEvent(client);
    await emitStored(Events.MessageCreate, message);

    expect(mockHandleLionCreatureMessage).toHaveBeenCalledWith(message);
    expect(mockAwardMessageXp).toHaveBeenCalled();
    expect(message.reply).not.toHaveBeenCalled();
  });

  it("logs lion command handler errors without crashing", async () => {
    const error = new Error("lion route failed");
    const { client, emitStored } = createFakeClient();
    const message = createFakeMessage({
      content: "~lions"
    });
    mockHandleLionCreatureMessage.mockRejectedValue(error);

    registerMessageCreateEvent(client);
    await emitStored(Events.MessageCreate, message);

    expect(mockLoggerError).toHaveBeenCalledWith(
      "Lion creature message command failed",
      {
        guildId: "guild_123",
        channelId: "channel_123",
        userId: "user_123",
        error
      }
    );
    expect(mockRecordChannelActivity).not.toHaveBeenCalled();
    expect(mockAwardMessageXp).not.toHaveBeenCalled();
  });
});

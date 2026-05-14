import { describe, expect, it, vi } from "vitest";

import {
  attachRedEnvelopeMessage,
  claimRedEnvelope,
  configureRedEnvelopeDrops,
  createRedEnvelope,
  generateRandomDrop,
  getRedEnvelopeDropConfig,
  getOpenRedEnvelopeForChannel,
  setRedEnvelopeDropConfigEnabled,
  type RedEnvelopeRecord
} from "../src/features/economy/red-envelope.service.js";
import type { UserProfileRecord } from "../src/features/profiles/profile.service.js";

const buildEnvelope = (
  overrides: Partial<RedEnvelopeRecord> = {}
): RedEnvelopeRecord => ({
  id: "envelope_123",
  guildId: "guild_123",
  channelId: "channel_123",
  createdByUserId: "officer_123",
  createdByDisplayName: "OfficerA",
  amount: 40,
  status: "OPEN",
  messageId: null,
  claimedByUserId: null,
  claimedByDisplayName: null,
  claimedAt: null,
  createdAt: new Date("2026-05-14T12:00:00.000Z"),
  updatedAt: new Date("2026-05-14T12:00:00.000Z"),
  ...overrides
});

const buildProfile = (
  overrides: Partial<UserProfileRecord> = {}
): UserProfileRecord => ({
  id: "profile_123",
  guildId: "guild_123",
  userId: "member_123",
  displayName: "MemberA",
  xp: 0,
  level: 1,
  coins: 0,
  lastMessageXpAt: null,
  lastDailyClaimAt: null,
  createdAt: new Date("2026-05-14T12:00:00.000Z"),
  updatedAt: new Date("2026-05-14T12:00:00.000Z"),
  ...overrides
});

describe("red envelope service", () => {
  it("generates a random drop amount and next drop time within the configured bounds", () => {
    const result = generateRandomDrop({
      config: {
        minAmount: 10,
        maxAmount: 50,
        minIntervalMinutes: 60,
        maxIntervalMinutes: 180
      },
      now: new Date("2026-05-14T12:00:00.000Z"),
      random: () => 0.5
    });

    expect(result.amount).toBeGreaterThanOrEqual(10);
    expect(result.amount).toBeLessThanOrEqual(50);
    expect(result.nextDropAt.getTime()).toBeGreaterThan(
      new Date("2026-05-14T12:00:00.000Z").getTime()
    );
  });

  it("creates and attaches a red envelope message id", async () => {
    const envelope = buildEnvelope();
    const create = vi.fn().mockResolvedValue(envelope);
    const update = vi.fn().mockResolvedValue(
      buildEnvelope({
        messageId: "message_123"
      })
    );

    const created = await createRedEnvelope(
      {
        redEnvelope: {
          create,
          findFirst: vi.fn(),
          findUnique: vi.fn(),
          update,
          updateMany: vi.fn()
        }
      },
      {
        guildId: "guild_123",
        channelId: "channel_123",
        createdByUserId: "officer_123",
        createdByDisplayName: "OfficerA",
        amount: 40
      }
    );

    const attached = await attachRedEnvelopeMessage(
      {
        redEnvelope: {
          create,
          findFirst: vi.fn(),
          findUnique: vi.fn(),
          update,
          updateMany: vi.fn()
        }
      },
      {
        envelopeId: "envelope_123",
        messageId: "message_123"
      }
    );

    expect(create).toHaveBeenCalledWith({
      data: {
        guildId: "guild_123",
        channelId: "channel_123",
        createdByUserId: "officer_123",
        createdByDisplayName: "OfficerA",
        amount: 40
      }
    });
    expect(update).toHaveBeenCalledWith({
      where: {
        id: "envelope_123"
      },
      data: {
        messageId: "message_123"
      }
    });
    expect(created.amount).toBe(40);
    expect(attached.messageId).toBe("message_123");
  });

  it("awards coins to the first successful claimant", async () => {
    let currentEnvelope = buildEnvelope();
    let currentProfile = buildProfile({
      coins: 20
    });

    const store = {
      redEnvelope: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(async () => currentEnvelope),
        update: vi.fn(),
        updateMany: vi.fn(async ({ data }) => {
          currentEnvelope = buildEnvelope({
            ...currentEnvelope,
            status: data.status,
            claimedByUserId: data.claimedByUserId,
            claimedByDisplayName: data.claimedByDisplayName,
            claimedAt: data.claimedAt
          });
          return { count: 1 };
        })
      },
      userProfile: {
        upsert: vi.fn(async ({ update }) => {
          currentProfile = {
            ...currentProfile,
            displayName: update.displayName
          };
          return currentProfile;
        }),
        update: vi.fn(async ({ data }) => {
          currentProfile = {
            ...currentProfile,
            displayName: data.displayName,
            xp: data.xp ?? currentProfile.xp,
            level: data.level ?? currentProfile.level,
            coins: data.coins ?? currentProfile.coins,
            lastMessageXpAt:
              data.lastMessageXpAt === undefined
                ? currentProfile.lastMessageXpAt
                : data.lastMessageXpAt,
            lastDailyClaimAt:
              data.lastDailyClaimAt === undefined
                ? currentProfile.lastDailyClaimAt
                : data.lastDailyClaimAt
          };
          return currentProfile;
        })
      }
    };

    const result = await claimRedEnvelope(store, {
      envelopeId: "envelope_123",
      userId: "member_123",
      displayName: "MemberA",
      claimedAt: new Date("2026-05-14T12:30:00.000Z")
    });

    expect(result.outcome).toBe("claimed");
    expect(result.envelope?.status).toBe("CLAIMED");
    expect(result.envelope?.claimedByUserId).toBe("member_123");
    expect(result.profile?.coins).toBe(60);
  });

  it("does not allow a second claim after the envelope is already claimed", async () => {
    const claimedEnvelope = buildEnvelope({
      status: "CLAIMED",
      claimedByUserId: "member_123",
      claimedByDisplayName: "MemberA",
      claimedAt: new Date("2026-05-14T12:30:00.000Z")
    });

    const result = await claimRedEnvelope(
      {
        redEnvelope: {
          create: vi.fn(),
          findFirst: vi.fn(),
          findUnique: vi.fn().mockResolvedValue(claimedEnvelope),
          update: vi.fn(),
          updateMany: vi.fn()
        },
        userProfile: {
          upsert: vi.fn(),
          update: vi.fn()
        }
      },
      {
        envelopeId: "envelope_123",
        userId: "member_456",
        displayName: "MemberB",
        claimedAt: new Date("2026-05-14T12:31:00.000Z")
      }
    );

    expect(result.outcome).toBe("already_claimed");
    expect(result.profile).toBeNull();
    expect(result.envelope?.claimedByDisplayName).toBe("MemberA");
  });

  it("stores random drop configuration per guild", async () => {
    const upsert = vi.fn().mockResolvedValue({
      id: "config_123",
      guildId: "guild_123",
      channelId: "channel_123",
      enabled: true,
      minAmount: 10,
      maxAmount: 50,
      minIntervalMinutes: 60,
      maxIntervalMinutes: 180,
      nextDropAt: new Date("2026-05-14T13:00:00.000Z"),
      lastDroppedAt: null,
      createdAt: new Date("2026-05-14T12:00:00.000Z"),
      updatedAt: new Date("2026-05-14T12:00:00.000Z")
    });

    const config = await configureRedEnvelopeDrops(
      {
        redEnvelopeDropConfig: {
          findUnique: vi.fn(),
          findMany: vi.fn(),
          upsert,
          update: vi.fn()
        }
      },
      {
        guildId: "guild_123",
        channelId: "channel_123",
        enabled: true,
        minAmount: 10,
        maxAmount: 50,
        minIntervalMinutes: 60,
        maxIntervalMinutes: 180,
        nextDropAt: new Date("2026-05-14T13:00:00.000Z")
      }
    );

    expect(upsert).toHaveBeenCalledWith({
      where: {
        guildId: "guild_123"
      },
      create: {
        guildId: "guild_123",
        channelId: "channel_123",
        enabled: true,
        minAmount: 10,
        maxAmount: 50,
        minIntervalMinutes: 60,
        maxIntervalMinutes: 180,
        nextDropAt: new Date("2026-05-14T13:00:00.000Z")
      },
      update: {
        channelId: "channel_123",
        enabled: true,
        minAmount: 10,
        maxAmount: 50,
        minIntervalMinutes: 60,
        maxIntervalMinutes: 180,
        nextDropAt: new Date("2026-05-14T13:00:00.000Z")
      }
    });
    expect(config.channelId).toBe("channel_123");
  });

  it("loads the stored red envelope drop configuration for a guild", async () => {
    const findUnique = vi.fn().mockResolvedValue({
      id: "config_123",
      guildId: "guild_123",
      channelId: "channel_123",
      enabled: true,
      minAmount: 10,
      maxAmount: 50,
      minIntervalMinutes: 60,
      maxIntervalMinutes: 180,
      nextDropAt: new Date("2026-05-14T13:00:00.000Z"),
      lastDroppedAt: null,
      createdAt: new Date("2026-05-14T12:00:00.000Z"),
      updatedAt: new Date("2026-05-14T12:00:00.000Z")
    });

    const config = await getRedEnvelopeDropConfig(
      {
        redEnvelopeDropConfig: {
          findUnique,
          findMany: vi.fn(),
          upsert: vi.fn(),
          update: vi.fn()
        }
      },
      "guild_123"
    );

    expect(findUnique).toHaveBeenCalledWith({
      where: {
        guildId: "guild_123"
      }
    });
    expect(config?.guildId).toBe("guild_123");
  });

  it("can pause random red envelope drops for a guild", async () => {
    const update = vi.fn().mockResolvedValue({
      id: "config_123",
      guildId: "guild_123",
      channelId: "channel_123",
      enabled: false,
      minAmount: 10,
      maxAmount: 50,
      minIntervalMinutes: 60,
      maxIntervalMinutes: 180,
      nextDropAt: new Date("2026-05-14T13:00:00.000Z"),
      lastDroppedAt: null,
      createdAt: new Date("2026-05-14T12:00:00.000Z"),
      updatedAt: new Date("2026-05-14T12:05:00.000Z")
    });

    const config = await setRedEnvelopeDropConfigEnabled(
      {
        redEnvelopeDropConfig: {
          findUnique: vi.fn(),
          findMany: vi.fn(),
          upsert: vi.fn(),
          update
        }
      },
      {
        guildId: "guild_123",
        enabled: false
      }
    );

    expect(update).toHaveBeenCalledWith({
      where: {
        guildId: "guild_123"
      },
      data: {
        enabled: false
      }
    });
    expect(config.enabled).toBe(false);
  });

  it("finds the open red envelope for a specific channel", async () => {
    const findFirst = vi.fn().mockResolvedValue(buildEnvelope());

    const envelope = await getOpenRedEnvelopeForChannel(
      {
        redEnvelope: {
          create: vi.fn(),
          findFirst,
          findUnique: vi.fn(),
          update: vi.fn(),
          updateMany: vi.fn()
        }
      },
      {
        guildId: "guild_123",
        channelId: "channel_123"
      }
    );

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        guildId: "guild_123",
        channelId: "channel_123",
        status: "OPEN"
      }
    });
    expect(envelope?.id).toBe("envelope_123");
  });
});

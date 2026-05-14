import { describe, expect, it, vi } from "vitest";

import {
  attachRedEnvelopeMessage,
  claimRedEnvelope,
  createRedEnvelope,
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
});

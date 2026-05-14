import { describe, expect, it, vi } from "vitest";

import {
  MESSAGE_XP_AMOUNT,
  MESSAGE_XP_COOLDOWN_MS,
  awardMessageXp,
  canAwardMessageXp
} from "../src/features/progression/message-xp.service.js";
import type { UserProfileRecord } from "../src/features/profiles/profile.service.js";

const buildProfile = (
  overrides: Partial<UserProfileRecord> = {}
): UserProfileRecord => ({
  id: "profile_123",
  guildId: "guild_123",
  userId: "user_123",
  displayName: "Cardin",
  xp: 0,
  level: 1,
  coins: 0,
  lastMessageXpAt: null,
  createdAt: new Date("2026-05-13T00:00:00.000Z"),
  updatedAt: new Date("2026-05-13T00:00:00.000Z"),
  ...overrides
});

const buildStore = (profile: UserProfileRecord | null) => {
  let currentProfile = profile;

  return {
    userProfile: {
      findUnique: vi.fn(async () => currentProfile),
      upsert: vi.fn(async ({ create, update }) => {
        if (currentProfile) {
          currentProfile = {
            ...currentProfile,
            displayName: update.displayName
          };
          return currentProfile;
        }

        currentProfile = buildProfile({
          guildId: create.guildId,
          userId: create.userId,
          displayName: create.displayName
        });
        return currentProfile;
      }),
      update: vi.fn(async ({ data }) => {
        if (!currentProfile) {
          throw new Error("profile must exist before update");
        }

        currentProfile = {
          ...currentProfile,
          displayName: data.displayName,
          xp: data.xp ?? currentProfile.xp,
          level: data.level ?? currentProfile.level,
          coins: data.coins ?? currentProfile.coins,
          lastMessageXpAt:
            data.lastMessageXpAt === undefined
              ? currentProfile.lastMessageXpAt
              : data.lastMessageXpAt
        };

        return currentProfile;
      })
    }
  };
};

describe("canAwardMessageXp", () => {
  it("allows the first eligible message", () => {
    expect(
      canAwardMessageXp(null, new Date("2026-05-13T12:00:00.000Z"))
    ).toEqual({
      eligible: true,
      cooldownEndsAt: null
    });
  });

  it("blocks awards during the cooldown window", () => {
    const lastAwardedAt = new Date("2026-05-13T12:00:00.000Z");
    const now = new Date(lastAwardedAt.getTime() + MESSAGE_XP_COOLDOWN_MS - 1);

    expect(canAwardMessageXp(lastAwardedAt, now)).toEqual({
      eligible: false,
      cooldownEndsAt: new Date(lastAwardedAt.getTime() + MESSAGE_XP_COOLDOWN_MS)
    });
  });
});

describe("awardMessageXp", () => {
  it("creates a profile and awards 5 xp on the first eligible message", async () => {
    const store = buildStore(null);
    const awardedAt = new Date("2026-05-13T12:00:00.000Z");

    const result = await awardMessageXp(store, {
      guildId: "guild_123",
      userId: "user_123",
      displayName: "Cardin",
      awardedAt
    });

    expect(result.awarded).toBe(true);
    expect(result.profile.xp).toBe(MESSAGE_XP_AMOUNT);
    expect(result.profile.level).toBe(1);
    expect(result.profile.lastMessageXpAt).toEqual(awardedAt);
  });

  it("does not award xp again before the cooldown expires", async () => {
    const lastAwardedAt = new Date("2026-05-13T12:00:00.000Z");
    const store = buildStore(
      buildProfile({
        xp: MESSAGE_XP_AMOUNT,
        lastMessageXpAt: lastAwardedAt
      })
    );

    const result = await awardMessageXp(store, {
      guildId: "guild_123",
      userId: "user_123",
      displayName: "Cardin",
      awardedAt: new Date(lastAwardedAt.getTime() + 60_000)
    });

    expect(result.awarded).toBe(false);
    expect(result.profile.xp).toBe(MESSAGE_XP_AMOUNT);
    expect(result.cooldownEndsAt).toEqual(
      new Date(lastAwardedAt.getTime() + MESSAGE_XP_COOLDOWN_MS)
    );
  });

  it("awards another 5 xp after the cooldown expires", async () => {
    const lastAwardedAt = new Date("2026-05-13T12:00:00.000Z");
    const store = buildStore(
      buildProfile({
        xp: 95,
        lastMessageXpAt: lastAwardedAt
      })
    );

    const result = await awardMessageXp(store, {
      guildId: "guild_123",
      userId: "user_123",
      displayName: "Cardin",
      awardedAt: new Date(lastAwardedAt.getTime() + MESSAGE_XP_COOLDOWN_MS)
    });

    expect(result.awarded).toBe(true);
    expect(result.profile.xp).toBe(100);
    expect(result.profile.level).toBe(2);
  });
});

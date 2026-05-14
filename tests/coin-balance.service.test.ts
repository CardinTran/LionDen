import { describe, expect, it, vi } from "vitest";

import { adjustCoins } from "../src/features/economy/coin-balance.service.js";
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
  lastDailyClaimAt: null,
  createdAt: new Date("2026-05-13T00:00:00.000Z"),
  updatedAt: new Date("2026-05-13T00:00:00.000Z"),
  ...overrides
});

const buildStore = (profile: UserProfileRecord) => {
  let currentProfile = profile;

  return {
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
};

describe("adjustCoins", () => {
  it("adds coins without changing xp progression fields", async () => {
    const store = buildStore(
      buildProfile({
        xp: 125,
        level: 2,
        coins: 10
      })
    );

    const profile = await adjustCoins(store, {
      guildId: "guild_123",
      userId: "user_123",
      displayName: "Cardin",
      delta: 15
    });

    expect(profile.coins).toBe(25);
    expect(profile.xp).toBe(125);
    expect(profile.level).toBe(2);
  });

  it("removes coins but clamps the balance at zero", async () => {
    const store = buildStore(
      buildProfile({
        coins: 3
      })
    );

    const profile = await adjustCoins(store, {
      guildId: "guild_123",
      userId: "user_123",
      displayName: "Cardin",
      delta: -10
    });

    expect(profile.coins).toBe(0);
    expect(profile.xp).toBe(0);
    expect(profile.level).toBe(1);
  });
});

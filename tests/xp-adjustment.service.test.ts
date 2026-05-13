import { describe, expect, it, vi } from "vitest";

import { adjustXp } from "../src/features/progression/xp-adjustment.service.js";
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
  lastMessageXpAt: null,
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

describe("adjustXp", () => {
  it("adds xp and recalculates level", async () => {
    const store = buildStore(
      buildProfile({
        xp: 95,
        level: 1
      })
    );

    const profile = await adjustXp(store, {
      guildId: "guild_123",
      userId: "user_123",
      displayName: "Cardin",
      delta: 5
    });

    expect(profile.xp).toBe(100);
    expect(profile.level).toBe(2);
  });

  it("removes xp but clamps total xp at zero", async () => {
    const store = buildStore(
      buildProfile({
        xp: 3,
        level: 1
      })
    );

    const profile = await adjustXp(store, {
      guildId: "guild_123",
      userId: "user_123",
      displayName: "Cardin",
      delta: -10
    });

    expect(profile.xp).toBe(0);
    expect(profile.level).toBe(1);
  });
});

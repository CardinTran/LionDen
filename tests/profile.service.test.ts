import { describe, expect, it, vi } from "vitest";

import {
  getOrCreateProfile,
  type UserProfileRecord
} from "../src/features/profiles/profile.service.js";

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

describe("getOrCreateProfile", () => {
  it("upserts by guild and user and seeds a default profile", async () => {
    const upsert = vi.fn().mockResolvedValue(buildProfile());

    const profile = await getOrCreateProfile(
      {
        userProfile: { upsert }
      },
      {
        guildId: "guild_123",
        userId: "user_123",
        displayName: "Cardin"
      }
    );

    expect(upsert).toHaveBeenCalledWith({
      where: {
        guildId_userId: {
          guildId: "guild_123",
          userId: "user_123"
        }
      },
      create: {
        guildId: "guild_123",
        userId: "user_123",
        displayName: "Cardin"
      },
      update: {
        displayName: "Cardin"
      }
    });
    expect(profile.level).toBe(1);
    expect(profile.xp).toBe(0);
    expect(profile.coins).toBe(0);
  });
});

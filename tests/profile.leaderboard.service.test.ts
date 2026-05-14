import { describe, expect, it, vi } from "vitest";

import {
  listTopProfiles,
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

describe("listTopProfiles", () => {
  it("queries the top profiles for a guild with stable ordering", async () => {
    const findMany = vi.fn().mockResolvedValue([
      buildProfile({ displayName: "Alicia", xp: 225 }),
      buildProfile({ displayName: "Bao", xp: 100 })
    ]);

    const profiles = await listTopProfiles(
      {
        userProfile: { findMany }
      },
      {
        guildId: "guild_123",
        limit: 10
      }
    );

    expect(findMany).toHaveBeenCalledWith({
      where: {
        guildId: "guild_123"
      },
      orderBy: [{ xp: "desc" }, { updatedAt: "asc" }, { createdAt: "asc" }],
      take: 10
    });
    expect(profiles).toHaveLength(2);
    expect(profiles[0]?.displayName).toBe("Alicia");
  });
});

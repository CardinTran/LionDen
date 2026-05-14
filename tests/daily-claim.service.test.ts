import { describe, expect, it, vi } from "vitest";

import {
  DAILY_COIN_REWARD,
  DAILY_TIMEZONE,
  canClaimDaily,
  claimDaily,
  isSameCalendarDay
} from "../src/features/economy/daily-claim.service.js";
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

const buildStore = (profile: UserProfileRecord | null) => {
  let currentProfile = profile;

  return {
    userProfile: {
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

describe("daily claim eligibility", () => {
  it("treats two timestamps on the same Central Time day as the same claim day", () => {
    const first = new Date("2026-05-14T03:00:00.000Z");
    const second = new Date("2026-05-14T04:30:00.000Z");

    expect(isSameCalendarDay(first, second, DAILY_TIMEZONE)).toBe(true);
  });

  it("allows a new claim after the calendar day changes in Central Time", () => {
    const lastClaimAt = new Date("2026-05-14T04:30:00.000Z");
    const nextDay = new Date("2026-05-15T05:00:00.000Z");

    expect(canClaimDaily(lastClaimAt, nextDay, DAILY_TIMEZONE)).toMatchObject({
      eligible: true,
      nextClaimAt: null
    });
  });
});

describe("claimDaily", () => {
  it("awards coins on the first claim of the day", async () => {
    const claimedAt = new Date("2026-05-14T18:00:00.000Z");
    const store = buildStore(null);

    const result = await claimDaily(store, {
      guildId: "guild_123",
      userId: "user_123",
      displayName: "Cardin",
      claimedAt
    });

    expect(result.claimed).toBe(true);
    expect(result.coinsAwarded).toBe(DAILY_COIN_REWARD);
    expect(result.profile.coins).toBe(DAILY_COIN_REWARD);
    expect(result.profile.lastDailyClaimAt).toEqual(claimedAt);
  });

  it("blocks a second claim on the same Central Time day", async () => {
    const claimedAt = new Date("2026-05-14T18:00:00.000Z");
    const store = buildStore(
      buildProfile({
        coins: DAILY_COIN_REWARD,
        lastDailyClaimAt: claimedAt
      })
    );

    const result = await claimDaily(store, {
      guildId: "guild_123",
      userId: "user_123",
      displayName: "Cardin",
      claimedAt: new Date("2026-05-14T23:00:00.000Z")
    });

    expect(result.claimed).toBe(false);
    expect(result.coinsAwarded).toBe(0);
    expect(result.profile.coins).toBe(DAILY_COIN_REWARD);
  });

  it("allows a claim on the next Central Time day", async () => {
    const previousClaimAt = new Date("2026-05-14T23:00:00.000Z");
    const store = buildStore(
      buildProfile({
        coins: 40,
        lastDailyClaimAt: previousClaimAt
      })
    );

    const result = await claimDaily(store, {
      guildId: "guild_123",
      userId: "user_123",
      displayName: "Cardin",
      claimedAt: new Date("2026-05-15T05:00:00.000Z")
    });

    expect(result.claimed).toBe(true);
    expect(result.profile.coins).toBe(40 + DAILY_COIN_REWARD);
  });
});

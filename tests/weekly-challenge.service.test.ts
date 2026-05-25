import { describe, expect, it, vi } from "vitest";

import {
  getUserBadgeView,
  getUserWeeklyChallengeView,
  getWeeklyChallengeWeekKey,
  recordWeeklyChallengeProgress,
  syncDefaultWeeklyChallengeData,
  type BadgeDefinitionRecord,
  type UserBadgeRecord,
  type UserWeeklyChallengeProgressRecord,
  type WeeklyChallengeDefinitionRecord
} from "../src/features/challenges/weekly-challenge.service.js";

const now = new Date("2026-05-25T12:00:00.000Z");

const challengeDefinition: WeeklyChallengeDefinitionRecord = {
  id: "challenge_123",
  challengeKey: "practice-presence",
  title: "Practice Presence",
  description: "Mark yourself here for one practice attendance session.",
  activityType: "PRACTICE_ATTENDANCE",
  targetCount: 1,
  rewardXp: 25,
  rewardCoins: 20,
  isEnabled: true,
  createdAt: now,
  updatedAt: now
};

const badgeDefinition: BadgeDefinitionRecord = {
  id: "badge_123",
  badgeKey: "weekly-starter",
  title: "Weekly Starter",
  description: "Complete at least one LionDen weekly challenge.",
  isEnabled: true,
  createdAt: now,
  updatedAt: now
};

const buildProgress = (
  overrides: Partial<UserWeeklyChallengeProgressRecord> = {}
): UserWeeklyChallengeProgressRecord => ({
  id: "progress_123",
  guildId: "guild_123",
  userId: "user_123",
  challengeKey: "practice-presence",
  weekKey: "2026-W22",
  progressCount: 1,
  completedAt: now,
  rewardedAt: null,
  createdAt: now,
  updatedAt: now,
  ...overrides
});

const buildBadge = (
  overrides: Partial<UserBadgeRecord> = {}
): UserBadgeRecord => ({
  id: "user_badge_123",
  guildId: "guild_123",
  userId: "user_123",
  badgeKey: "weekly-starter",
  awardedAt: now,
  ...overrides
});

const createStore = () => ({
  weeklyChallengeDefinition: {
    upsert: vi.fn(async () => challengeDefinition),
    findMany: vi.fn(async () => [challengeDefinition])
  },
  userWeeklyChallengeProgress: {
    findUnique: vi.fn(
      async (): Promise<UserWeeklyChallengeProgressRecord | null> => null
    ),
    findMany: vi.fn(async () => [] as UserWeeklyChallengeProgressRecord[]),
    create: vi.fn(async () => buildProgress()),
    update: vi.fn(async () => buildProgress({ rewardedAt: now }))
  },
  badgeDefinition: {
    upsert: vi.fn(async () => badgeDefinition),
    findMany: vi.fn(async () => [badgeDefinition])
  },
  userBadge: {
    upsert: vi.fn(async () => buildBadge()),
    findMany: vi.fn(async () => [] as UserBadgeRecord[])
  },
  userProfile: {
    upsert: vi.fn(async () => ({
      id: "profile_123",
      guildId: "guild_123",
      userId: "user_123",
      displayName: "Mira",
      xp: 100,
      level: 2,
      coins: 50,
      lastMessageXpAt: null,
      lastDailyClaimAt: null,
      createdAt: now,
      updatedAt: now
    })),
    update: vi.fn(async (args) => ({
      id: "profile_123",
      guildId: "guild_123",
      userId: "user_123",
      displayName: args.data.displayName,
      xp: args.data.xp ?? 100,
      level: args.data.level ?? 2,
      coins: args.data.coins ?? 50,
      lastMessageXpAt: args.data.lastMessageXpAt ?? null,
      lastDailyClaimAt: args.data.lastDailyClaimAt ?? null,
      createdAt: now,
      updatedAt: now
    }))
  }
});

describe("weekly challenge service", () => {
  it("builds stable ISO-style week keys", () => {
    expect(getWeeklyChallengeWeekKey(new Date("2026-05-25T12:00:00.000Z"))).toBe(
      "2026-W22"
    );
    expect(getWeeklyChallengeWeekKey(new Date("2026-12-31T12:00:00.000Z"))).toBe(
      "2026-W53"
    );
  });

  it("syncs default challenge and badge definitions", async () => {
    const store = createStore();

    await syncDefaultWeeklyChallengeData(store);

    expect(store.weeklyChallengeDefinition.upsert).toHaveBeenCalledTimes(5);
    expect(store.badgeDefinition.upsert).toHaveBeenCalledTimes(1);
  });

  it("records progress, applies rewards once, and awards the starter badge", async () => {
    const store = createStore();

    const result = await recordWeeklyChallengeProgress(store, {
      guildId: "guild_123",
      userId: "user_123",
      displayName: "Mira",
      activityType: "PRACTICE_ATTENDANCE",
      occurredAt: now
    });

    expect(store.userWeeklyChallengeProgress.create).toHaveBeenCalledWith({
      data: {
        guildId: "guild_123",
        userId: "user_123",
        challengeKey: "practice-presence",
        weekKey: "2026-W22",
        progressCount: 1,
        completedAt: now
      }
    });
    expect(store.userProfile.update).toHaveBeenCalledTimes(2);
    expect(store.userBadge.upsert).toHaveBeenCalledWith({
      where: {
        guildId_userId_badgeKey: {
          guildId: "guild_123",
          userId: "user_123",
          badgeKey: "weekly-starter"
        }
      },
      create: {
        guildId: "guild_123",
        userId: "user_123",
        badgeKey: "weekly-starter",
        awardedAt: now
      },
      update: {}
    });
    expect(store.userWeeklyChallengeProgress.update).toHaveBeenCalledWith({
      where: {
        id: "progress_123"
      },
      data: {
        rewardedAt: now
      }
    });
    expect(result[0]?.rewardedAt).toEqual(now);
  });

  it("does not re-apply rewards for an already completed challenge", async () => {
    const completedProgress = buildProgress({
      completedAt: now,
      rewardedAt: now
    });
    const store = createStore();
    store.userWeeklyChallengeProgress.findUnique.mockResolvedValue(
      completedProgress
    );

    const result = await recordWeeklyChallengeProgress(store, {
      guildId: "guild_123",
      userId: "user_123",
      displayName: "Mira",
      activityType: "PRACTICE_ATTENDANCE",
      occurredAt: now
    });

    expect(store.userProfile.update).not.toHaveBeenCalled();
    expect(store.userBadge.upsert).not.toHaveBeenCalled();
    expect(result).toEqual([completedProgress]);
  });

  it("builds the current user challenge view", async () => {
    const progress = buildProgress({
      progressCount: 1,
      completedAt: now
    });
    const store = createStore();
    store.userWeeklyChallengeProgress.findMany.mockResolvedValue([progress]);

    const view = await getUserWeeklyChallengeView(store, {
      guildId: "guild_123",
      userId: "user_123",
      now
    });

    expect(view.weekKey).toBe("2026-W22");
    expect(view.challenges[0]).toMatchObject({
      definition: challengeDefinition,
      progress,
      progressCount: 1,
      isCompleted: true
    });
  });

  it("joins earned badges with enabled definitions", async () => {
    const badge = buildBadge();
    const store = createStore();
    store.userBadge.findMany.mockResolvedValue([badge]);

    const badges = await getUserBadgeView(store, {
      guildId: "guild_123",
      userId: "user_123"
    });

    expect(badges).toEqual([
      {
        badge,
        definition: badgeDefinition
      }
    ]);
  });
});

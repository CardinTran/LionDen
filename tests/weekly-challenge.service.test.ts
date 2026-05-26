import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_BADGES,
  DEFAULT_WEEKLY_CHALLENGES,
  getUserBadgeView,
  getUserWeeklyChallengeView,
  getWeeklyChallengeWeekKey,
  recordWeeklyChallengeProgress,
  syncDefaultWeeklyChallengeData,
  type BadgeDefinitionRecord,
  type UserBadgeRecord,
  type UserWeeklyChallengeProgressRecord,
  type WeeklyChallengeActivityTypeValue,
  type WeeklyChallengeDefinitionRecord
} from "../src/features/challenges/weekly-challenge.service.js";
import type { UserProfileRecord } from "../src/features/profiles/profile.service.js";

const now = new Date("2026-05-25T12:00:00.000Z");

const createId = (prefix: string, index: number): string =>
  `${prefix}_${index}`;

const buildChallengeDefinition = (
  overrides: Partial<WeeklyChallengeDefinitionRecord> = {}
): WeeklyChallengeDefinitionRecord => ({
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
  updatedAt: now,
  ...overrides
});

const buildBadgeDefinition = (
  overrides: Partial<BadgeDefinitionRecord> = {}
): BadgeDefinitionRecord => ({
  id: "badge_123",
  badgeKey: "weekly-starter",
  title: "Weekly Starter",
  description: "Complete at least one LionDen weekly challenge.",
  isEnabled: true,
  createdAt: now,
  updatedAt: now,
  ...overrides
});

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

const buildProfile = (
  overrides: Partial<UserProfileRecord> = {}
): UserProfileRecord => ({
  id: "profile_123",
  guildId: "guild_123",
  userId: "user_123",
  displayName: "Mira",
  xp: 0,
  level: 1,
  coins: 0,
  lastMessageXpAt: null,
  lastDailyClaimAt: null,
  createdAt: now,
  updatedAt: now,
  ...overrides
});

const applyDefinedUpdates = <RecordType extends object>(
  target: RecordType,
  updates: Partial<RecordType>
): RecordType => {
  for (const [key, value] of Object.entries(updates) as Array<
    [keyof RecordType, RecordType[keyof RecordType] | undefined]
  >) {
    if (value !== undefined) {
      target[key] = value;
    }
  }

  return target;
};

const createStore = () => ({
  weeklyChallengeDefinition: {
    upsert: vi.fn(async () => buildChallengeDefinition()),
    findMany: vi.fn(async () => [buildChallengeDefinition()])
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
    upsert: vi.fn(async () => buildBadgeDefinition()),
    findMany: vi.fn(async () => [buildBadgeDefinition()])
  },
  userBadge: {
    upsert: vi.fn(async () => buildBadge()),
    findMany: vi.fn(async () => [] as UserBadgeRecord[])
  },
  userProfile: {
    upsert: vi.fn(async () => buildProfile({ xp: 100, level: 2, coins: 50 })),
    update: vi.fn(async (args) =>
      buildProfile({
        displayName: args.data.displayName,
        xp: args.data.xp ?? 100,
        level: args.data.level ?? 2,
        coins: args.data.coins ?? 50,
        lastMessageXpAt: args.data.lastMessageXpAt ?? null,
        lastDailyClaimAt: args.data.lastDailyClaimAt ?? null
      })
    )
  }
});

const createLifecycleStore = () => {
  const challengeDefinitions: WeeklyChallengeDefinitionRecord[] = [];
  const badgeDefinitions: BadgeDefinitionRecord[] = [];
  const progressRecords: UserWeeklyChallengeProgressRecord[] = [];
  const userBadges: UserBadgeRecord[] = [];
  const userProfiles: UserProfileRecord[] = [];

  const getProfileKey = (guildId: string, userId: string): string =>
    `${guildId}:${userId}`;
  const getProgressKey = (
    input: Pick<
      UserWeeklyChallengeProgressRecord,
      "guildId" | "userId" | "challengeKey" | "weekKey"
    >
  ): string =>
    `${input.guildId}:${input.userId}:${input.challengeKey}:${input.weekKey}`;
  const getBadgeKey = (
    input: Pick<UserBadgeRecord, "guildId" | "userId" | "badgeKey">
  ): string => `${input.guildId}:${input.userId}:${input.badgeKey}`;

  const store = {
    weeklyChallengeDefinition: {
      upsert: vi.fn(async (args) => {
        const existing = challengeDefinitions.find(
          (definition) => definition.challengeKey === args.where.challengeKey
        );

        if (existing) {
          Object.assign(existing, args.update, {
            updatedAt: now
          });
          return existing;
        }

        const created = buildChallengeDefinition({
          ...args.create,
          id: createId("challenge", challengeDefinitions.length + 1)
        });
        challengeDefinitions.push(created);
        return created;
      }),
      findMany: vi.fn(async (args) => {
        let result = [...challengeDefinitions];

        if (args?.where?.activityType) {
          result = result.filter(
            (definition) => definition.activityType === args.where?.activityType
          );
        }

        if (args?.where?.isEnabled !== undefined) {
          result = result.filter(
            (definition) => definition.isEnabled === args.where?.isEnabled
          );
        }

        if (
          args?.orderBy?.some(
            (entry: { challengeKey?: "asc" | "desc" }) =>
              entry.challengeKey === "asc"
          )
        ) {
          result.sort((first, second) =>
            first.challengeKey.localeCompare(second.challengeKey)
          );
        }

        return result;
      })
    },
    userWeeklyChallengeProgress: {
      findUnique: vi.fn(async (args) => {
        const targetKey = getProgressKey(
          args.where.guildId_userId_challengeKey_weekKey
        );
        return (
          progressRecords.find(
            (progress) => getProgressKey(progress) === targetKey
          ) ?? null
        );
      }),
      findMany: vi.fn(async (args) =>
        progressRecords.filter(
          (progress) =>
            progress.guildId === args.where.guildId &&
            progress.userId === args.where.userId &&
            progress.weekKey === args.where.weekKey
        )
      ),
      create: vi.fn(async (args) => {
        const created = buildProgress({
          ...args.data,
          id: createId("progress", progressRecords.length + 1),
          completedAt: args.data.completedAt ?? null,
          rewardedAt: args.data.rewardedAt ?? null
        });
        progressRecords.push(created);
        return created;
      }),
      update: vi.fn(async (args) => {
        const existing = progressRecords.find(
          (progress) => progress.id === args.where.id
        );

        if (!existing) {
          throw new Error(`Missing progress ${args.where.id}`);
        }

        applyDefinedUpdates(existing, {
          ...args.data,
          updatedAt: now
        });
        return existing;
      })
    },
    badgeDefinition: {
      upsert: vi.fn(async (args) => {
        const existing = badgeDefinitions.find(
          (definition) => definition.badgeKey === args.where.badgeKey
        );

        if (existing) {
          Object.assign(existing, args.update, {
            updatedAt: now
          });
          return existing;
        }

        const created = buildBadgeDefinition({
          ...args.create,
          id: createId("badge", badgeDefinitions.length + 1)
        });
        badgeDefinitions.push(created);
        return created;
      }),
      findMany: vi.fn(async (args) => {
        let result = [...badgeDefinitions];

        if (args?.where?.isEnabled !== undefined) {
          result = result.filter(
            (definition) => definition.isEnabled === args.where?.isEnabled
          );
        }

        if (
          args?.orderBy?.some(
            (entry: { badgeKey?: "asc" | "desc" }) => entry.badgeKey === "asc"
          )
        ) {
          result.sort((first, second) =>
            first.badgeKey.localeCompare(second.badgeKey)
          );
        }

        return result;
      })
    },
    userBadge: {
      upsert: vi.fn(async (args) => {
        const targetKey = getBadgeKey(args.where.guildId_userId_badgeKey);
        const existing = userBadges.find(
          (badge) => getBadgeKey(badge) === targetKey
        );

        if (existing) {
          return existing;
        }

        const created = buildBadge({
          ...args.create,
          id: createId("user_badge", userBadges.length + 1)
        });
        userBadges.push(created);
        return created;
      }),
      findMany: vi.fn(async (args) =>
        userBadges
          .filter(
            (badge) =>
              badge.guildId === args.where.guildId &&
              badge.userId === args.where.userId
          )
          .sort((first, second) =>
            args.orderBy?.some(
              (entry: { awardedAt?: "asc" | "desc" }) =>
                entry.awardedAt === "desc"
            )
              ? second.awardedAt.getTime() - first.awardedAt.getTime()
              : first.awardedAt.getTime() - second.awardedAt.getTime()
          )
      )
    },
    userProfile: {
      upsert: vi.fn(async (args) => {
        const targetKey = getProfileKey(
          args.where.guildId_userId.guildId,
          args.where.guildId_userId.userId
        );
        const existing = userProfiles.find(
          (profile) =>
            getProfileKey(profile.guildId, profile.userId) === targetKey
        );

        if (existing) {
          existing.displayName = args.update.displayName;
          existing.updatedAt = now;
          return existing;
        }

        const created = buildProfile({
          ...args.create,
          id: createId("profile", userProfiles.length + 1)
        });
        userProfiles.push(created);
        return created;
      }),
      update: vi.fn(async (args) => {
        const targetKey = getProfileKey(
          args.where.guildId_userId.guildId,
          args.where.guildId_userId.userId
        );
        const existing = userProfiles.find(
          (profile) =>
            getProfileKey(profile.guildId, profile.userId) === targetKey
        );

        if (!existing) {
          throw new Error(`Missing profile ${targetKey}`);
        }

        applyDefinedUpdates(existing, {
          ...args.data,
          updatedAt: now
        });
        return existing;
      })
    }
  };

  return {
    store,
    challengeDefinitions,
    badgeDefinitions,
    progressRecords,
    userBadges,
    userProfiles
  };
};

const recordActivity = async (
  store: ReturnType<typeof createLifecycleStore>["store"],
  input: {
    guildId?: string;
    userId?: string;
    displayName?: string;
    activityType: WeeklyChallengeActivityTypeValue;
    amount?: number;
    occurredAt?: Date;
  }
): Promise<UserWeeklyChallengeProgressRecord[]> =>
  recordWeeklyChallengeProgress(store, {
    guildId: input.guildId ?? "guild_123",
    userId: input.userId ?? "user_123",
    displayName: input.displayName ?? "Mira",
    activityType: input.activityType,
    amount: input.amount,
    occurredAt: input.occurredAt ?? now
  });

describe("weekly challenge service", () => {
  it("builds deterministic ISO-style week keys from fixed dates", () => {
    expect(
      getWeeklyChallengeWeekKey(new Date("2026-05-25T12:00:00.000Z"))
    ).toBe("2026-W22");
    expect(
      getWeeklyChallengeWeekKey(new Date("2026-05-29T23:59:00.000Z"))
    ).toBe("2026-W22");
    expect(
      getWeeklyChallengeWeekKey(new Date("2026-06-01T12:00:00.000Z"))
    ).toBe("2026-W23");
    expect(
      getWeeklyChallengeWeekKey(new Date("2027-01-01T12:00:00.000Z"))
    ).toBe("2026-W53");
  });

  it("syncs default challenge and badge definitions", async () => {
    const store = createStore();

    await syncDefaultWeeklyChallengeData(store);

    expect(store.weeklyChallengeDefinition.upsert).toHaveBeenCalledTimes(5);
    expect(store.badgeDefinition.upsert).toHaveBeenCalledTimes(1);
  });

  it("syncs default challenge and badge definitions idempotently", async () => {
    const { store, challengeDefinitions, badgeDefinitions } =
      createLifecycleStore();

    await syncDefaultWeeklyChallengeData(store);
    await syncDefaultWeeklyChallengeData(store);

    expect(challengeDefinitions).toHaveLength(DEFAULT_WEEKLY_CHALLENGES.length);
    expect(badgeDefinitions).toHaveLength(DEFAULT_BADGES.length);
    expect(
      new Set(challengeDefinitions.map((definition) => definition.challengeKey))
        .size
    ).toBe(DEFAULT_WEEKLY_CHALLENGES.length);
    expect(
      new Set(badgeDefinitions.map((definition) => definition.badgeKey)).size
    ).toBe(DEFAULT_BADGES.length);
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

  it("creates progress records scoped by guild, user, challenge, and week", async () => {
    const { store, progressRecords } = createLifecycleStore();

    await recordActivity(store, {
      activityType: "LION_CATCH",
      amount: 1,
      occurredAt: new Date("2026-05-25T12:00:00.000Z")
    });

    expect(progressRecords).toHaveLength(1);
    expect(progressRecords[0]).toMatchObject({
      guildId: "guild_123",
      userId: "user_123",
      challengeKey: "lion-catcher",
      weekKey: "2026-W22",
      progressCount: 1,
      completedAt: null,
      rewardedAt: null
    });
  });

  it("increments progress, caps at the target, and preserves completion timestamps", async () => {
    const { store, progressRecords, userProfiles, userBadges } =
      createLifecycleStore();
    const firstActivityAt = new Date("2026-05-25T12:00:00.000Z");
    const completionAt = new Date("2026-05-26T12:00:00.000Z");
    const laterActivityAt = new Date("2026-05-27T12:00:00.000Z");

    await recordActivity(store, {
      activityType: "LION_CATCH",
      occurredAt: firstActivityAt
    });
    await recordActivity(store, {
      activityType: "LION_CATCH",
      amount: 5,
      occurredAt: completionAt
    });
    await recordActivity(store, {
      activityType: "LION_CATCH",
      occurredAt: laterActivityAt
    });

    expect(progressRecords).toHaveLength(1);
    expect(progressRecords[0]).toMatchObject({
      challengeKey: "lion-catcher",
      progressCount: 3,
      completedAt: completionAt,
      rewardedAt: completionAt
    });
    expect(userProfiles[0]).toMatchObject({
      xp: 20,
      coins: 15
    });
    expect(userBadges).toHaveLength(1);
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

  it("applies XP and coin rewards only once when a profile does not exist yet", async () => {
    const { store, progressRecords, userProfiles, userBadges } =
      createLifecycleStore();
    const completedAt = new Date("2026-05-25T12:00:00.000Z");
    const repeatedAt = new Date("2026-05-26T12:00:00.000Z");

    await recordActivity(store, {
      activityType: "PRACTICE_ATTENDANCE",
      occurredAt: completedAt
    });
    await recordActivity(store, {
      activityType: "PRACTICE_ATTENDANCE",
      occurredAt: repeatedAt
    });

    expect(progressRecords).toHaveLength(1);
    expect(progressRecords[0]).toMatchObject({
      progressCount: 1,
      completedAt,
      rewardedAt: completedAt
    });
    expect(userProfiles).toHaveLength(1);
    expect(userProfiles[0]).toMatchObject({
      guildId: "guild_123",
      userId: "user_123",
      displayName: "Mira",
      xp: 25,
      coins: 20
    });
    expect(userBadges).toHaveLength(1);
  });

  it("records House points when a weekly challenge is newly completed", async () => {
    const { store } = createLifecycleStore();
    const houseLedgers: unknown[] = [];
    const house = {
      id: "house_123",
      guildId: "guild_123",
      houseKey: "red-house",
      name: "Red House",
      description: null,
      emoji: null,
      color: null,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };

    Object.assign(store, {
      house: {
        findUnique: vi.fn(async () => house),
        findMany: vi.fn(async () => [house]),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn()
      },
      houseMembership: {
        findUnique: vi.fn(async () => ({
          id: "membership_123",
          guildId: "guild_123",
          houseId: house.id,
          userId: "user_123",
          joinedAt: now,
          updatedAt: now
        })),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
      },
      housePointLedger: {
        findUnique: vi.fn(async () => null),
        findMany: vi.fn(async () => []),
        create: vi.fn(async ({ data }) => {
          houseLedgers.push(data);
          return {
            id: "ledger_123",
            createdAt: now,
            ...data
          };
        })
      }
    });

    await recordActivity(store, {
      activityType: "PRACTICE_ATTENDANCE"
    });
    await recordActivity(store, {
      activityType: "PRACTICE_ATTENDANCE"
    });

    expect(houseLedgers).toEqual([
      {
        guildId: "guild_123",
        houseId: "house_123",
        userId: "user_123",
        sourceType: "WEEKLY_CHALLENGE",
        sourceId: "2026-W22:practice-presence:user_123",
        points: 5,
        reason: "Weekly challenge completed: practice-presence"
      }
    ]);
  });

  it("ignores disabled challenge definitions when recording progress", async () => {
    const { store, challengeDefinitions, progressRecords } =
      createLifecycleStore();

    challengeDefinitions.push(
      buildChallengeDefinition({
        id: "challenge_disabled",
        challengeKey: "disabled-catch",
        title: "Disabled Catch",
        activityType: "LION_CATCH",
        targetCount: 1,
        rewardXp: 99,
        rewardCoins: 99,
        isEnabled: false
      })
    );

    await recordActivity(store, {
      activityType: "LION_CATCH"
    });

    expect(
      progressRecords.some(
        (progress) => progress.challengeKey === "disabled-catch"
      )
    ).toBe(false);
    expect(
      progressRecords.some(
        (progress) => progress.challengeKey === "lion-catcher"
      )
    ).toBe(true);
  });

  it("syncs missing default definitions before recording progress", async () => {
    const { store, challengeDefinitions, badgeDefinitions, progressRecords } =
      createLifecycleStore();

    await recordActivity(store, {
      activityType: "RED_ENVELOPE_CLAIM"
    });

    expect(challengeDefinitions).toHaveLength(DEFAULT_WEEKLY_CHALLENGES.length);
    expect(badgeDefinitions).toHaveLength(DEFAULT_BADGES.length);
    expect(progressRecords).toHaveLength(1);
    expect(progressRecords[0]?.challengeKey).toBe("lucky-envelope");
  });

  it("isolates progress by guild, user, and week", async () => {
    const { store, progressRecords } = createLifecycleStore();

    await recordActivity(store, {
      guildId: "guild_123",
      userId: "user_123",
      activityType: "LION_TRAIN",
      occurredAt: new Date("2026-05-25T12:00:00.000Z")
    });
    await recordActivity(store, {
      guildId: "guild_123",
      userId: "user_456",
      activityType: "LION_TRAIN",
      occurredAt: new Date("2026-05-25T12:00:00.000Z")
    });
    await recordActivity(store, {
      guildId: "guild_456",
      userId: "user_123",
      activityType: "LION_TRAIN",
      occurredAt: new Date("2026-05-25T12:00:00.000Z")
    });
    await recordActivity(store, {
      guildId: "guild_123",
      userId: "user_123",
      activityType: "LION_TRAIN",
      occurredAt: new Date("2026-06-01T12:00:00.000Z")
    });

    expect(progressRecords).toHaveLength(4);
    expect(
      progressRecords.map((progress) => ({
        guildId: progress.guildId,
        userId: progress.userId,
        weekKey: progress.weekKey,
        progressCount: progress.progressCount
      }))
    ).toEqual([
      {
        guildId: "guild_123",
        userId: "user_123",
        weekKey: "2026-W22",
        progressCount: 1
      },
      {
        guildId: "guild_123",
        userId: "user_456",
        weekKey: "2026-W22",
        progressCount: 1
      },
      {
        guildId: "guild_456",
        userId: "user_123",
        weekKey: "2026-W22",
        progressCount: 1
      },
      {
        guildId: "guild_123",
        userId: "user_123",
        weekKey: "2026-W23",
        progressCount: 1
      }
    ]);
  });

  it("awards the same badge only once and lists its enabled metadata", async () => {
    const { store, userBadges } = createLifecycleStore();

    await recordActivity(store, {
      activityType: "PRACTICE_ATTENDANCE"
    });
    await recordActivity(store, {
      activityType: "RED_ENVELOPE_CLAIM"
    });

    expect(userBadges).toHaveLength(1);
    expect(userBadges[0]).toMatchObject({
      guildId: "guild_123",
      userId: "user_123",
      badgeKey: "weekly-starter"
    });

    const badges = await getUserBadgeView(store, {
      guildId: "guild_123",
      userId: "user_123"
    });

    expect(badges).toHaveLength(1);
    expect(badges[0]?.definition).toMatchObject({
      badgeKey: "weekly-starter",
      title: "Weekly Starter"
    });
  });

  it("scopes badges by guild, user, and badge key", async () => {
    const { store, userBadges } = createLifecycleStore();

    await recordActivity(store, {
      guildId: "guild_123",
      userId: "user_123",
      activityType: "PRACTICE_ATTENDANCE"
    });
    await recordActivity(store, {
      guildId: "guild_123",
      userId: "user_456",
      activityType: "PRACTICE_ATTENDANCE"
    });
    await recordActivity(store, {
      guildId: "guild_456",
      userId: "user_123",
      activityType: "PRACTICE_ATTENDANCE"
    });

    expect(userBadges).toHaveLength(3);
    expect(
      userBadges.map((badge) => ({
        guildId: badge.guildId,
        userId: badge.userId,
        badgeKey: badge.badgeKey
      }))
    ).toEqual([
      {
        guildId: "guild_123",
        userId: "user_123",
        badgeKey: "weekly-starter"
      },
      {
        guildId: "guild_123",
        userId: "user_456",
        badgeKey: "weekly-starter"
      },
      {
        guildId: "guild_456",
        userId: "user_123",
        badgeKey: "weekly-starter"
      }
    ]);
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
      definition: buildChallengeDefinition(),
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
        definition: buildBadgeDefinition()
      }
    ]);
  });
});

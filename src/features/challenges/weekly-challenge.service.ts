import { adjustCoins } from "../economy/coin-balance.service.js";
import type { UserProfileRecord } from "../profiles/profile.service.js";
import { adjustXp } from "../progression/xp-adjustment.service.js";

export type WeeklyChallengeActivityTypeValue =
  | "PRACTICE_ATTENDANCE"
  | "LION_CATCH"
  | "LION_TRAIN"
  | "RED_ENVELOPE_CLAIM"
  | "TRAINING_HALL_BATTLE";

export interface WeeklyChallengeDefinitionRecord {
  id: string;
  challengeKey: string;
  title: string;
  description: string;
  activityType: WeeklyChallengeActivityTypeValue;
  targetCount: number;
  rewardXp: number;
  rewardCoins: number;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWeeklyChallengeProgressRecord {
  id: string;
  guildId: string;
  userId: string;
  challengeKey: string;
  weekKey: string;
  progressCount: number;
  completedAt: Date | null;
  rewardedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BadgeDefinitionRecord {
  id: string;
  badgeKey: string;
  title: string;
  description: string;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserBadgeRecord {
  id: string;
  guildId: string;
  userId: string;
  badgeKey: string;
  awardedAt: Date;
}

export interface WeeklyChallengeViewEntry {
  definition: WeeklyChallengeDefinitionRecord;
  progress: UserWeeklyChallengeProgressRecord | null;
  progressCount: number;
  isCompleted: boolean;
}

export interface UserBadgeViewEntry {
  badge: UserBadgeRecord;
  definition: BadgeDefinitionRecord | null;
}

interface UserProfileDelegate {
  upsert(args: {
    where: {
      guildId_userId: {
        guildId: string;
        userId: string;
      };
    };
    create: {
      guildId: string;
      userId: string;
      displayName: string;
    };
    update: {
      displayName: string;
    };
  }): Promise<UserProfileRecord>;
  update(args: {
    where: {
      guildId_userId: {
        guildId: string;
        userId: string;
      };
    };
    data: {
      displayName: string;
      xp?: number;
      level?: number;
      coins?: number;
      lastMessageXpAt?: Date | null;
      lastDailyClaimAt?: Date | null;
    };
  }): Promise<UserProfileRecord>;
}

interface WeeklyChallengeStore {
  weeklyChallengeDefinition: {
    upsert(args: {
      where: {
        challengeKey: string;
      };
      create: {
        challengeKey: string;
        title: string;
        description: string;
        activityType: WeeklyChallengeActivityTypeValue;
        targetCount: number;
        rewardXp: number;
        rewardCoins: number;
        isEnabled: boolean;
      };
      update: {
        title: string;
        description: string;
        activityType: WeeklyChallengeActivityTypeValue;
        targetCount: number;
        rewardXp: number;
        rewardCoins: number;
        isEnabled: boolean;
      };
    }): Promise<WeeklyChallengeDefinitionRecord>;
    findMany(args?: {
      where?: {
        activityType?: WeeklyChallengeActivityTypeValue;
        isEnabled?: boolean;
      };
      orderBy?: Array<{
        challengeKey?: "asc" | "desc";
      }>;
    }): Promise<WeeklyChallengeDefinitionRecord[]>;
  };
  userWeeklyChallengeProgress: {
    findUnique(args: {
      where: {
        guildId_userId_challengeKey_weekKey: {
          guildId: string;
          userId: string;
          challengeKey: string;
          weekKey: string;
        };
      };
    }): Promise<UserWeeklyChallengeProgressRecord | null>;
    findMany(args: {
      where: {
        guildId: string;
        userId: string;
        weekKey: string;
      };
    }): Promise<UserWeeklyChallengeProgressRecord[]>;
    create(args: {
      data: {
        guildId: string;
        userId: string;
        challengeKey: string;
        weekKey: string;
        progressCount: number;
        completedAt?: Date | null;
        rewardedAt?: Date | null;
      };
    }): Promise<UserWeeklyChallengeProgressRecord>;
    update(args: {
      where: {
        id: string;
      };
      data: {
        progressCount?: number;
        completedAt?: Date | null;
        rewardedAt?: Date | null;
      };
    }): Promise<UserWeeklyChallengeProgressRecord>;
  };
  badgeDefinition: {
    upsert(args: {
      where: {
        badgeKey: string;
      };
      create: {
        badgeKey: string;
        title: string;
        description: string;
        isEnabled: boolean;
      };
      update: {
        title: string;
        description: string;
        isEnabled: boolean;
      };
    }): Promise<BadgeDefinitionRecord>;
    findMany(args?: {
      where?: {
        isEnabled?: boolean;
      };
      orderBy?: Array<{
        badgeKey?: "asc" | "desc";
      }>;
    }): Promise<BadgeDefinitionRecord[]>;
  };
  userBadge: {
    upsert(args: {
      where: {
        guildId_userId_badgeKey: {
          guildId: string;
          userId: string;
          badgeKey: string;
        };
      };
      create: {
        guildId: string;
        userId: string;
        badgeKey: string;
        awardedAt: Date;
      };
      update: Record<string, never>;
    }): Promise<UserBadgeRecord>;
    findMany(args: {
      where: {
        guildId: string;
        userId: string;
      };
      orderBy?: Array<{
        awardedAt?: "asc" | "desc";
      }>;
    }): Promise<UserBadgeRecord[]>;
  };
  userProfile: UserProfileDelegate;
}

export const DEFAULT_WEEKLY_CHALLENGES: Array<
  Omit<WeeklyChallengeDefinitionRecord, "id" | "createdAt" | "updatedAt">
> = [
  {
    challengeKey: "practice-presence",
    title: "Practice Presence",
    description: "Mark yourself here for one practice attendance session.",
    activityType: "PRACTICE_ATTENDANCE",
    targetCount: 1,
    rewardXp: 25,
    rewardCoins: 20,
    isEnabled: true
  },
  {
    challengeKey: "lion-catcher",
    title: "Lion Catcher",
    description: "Catch three wild lions this week.",
    activityType: "LION_CATCH",
    targetCount: 3,
    rewardXp: 20,
    rewardCoins: 15,
    isEnabled: true
  },
  {
    challengeKey: "training-rhythm",
    title: "Training Rhythm",
    description: "Train five owned lions this week.",
    activityType: "LION_TRAIN",
    targetCount: 5,
    rewardXp: 30,
    rewardCoins: 0,
    isEnabled: true
  },
  {
    challengeKey: "lucky-envelope",
    title: "Lucky Envelope",
    description: "Claim one red envelope this week.",
    activityType: "RED_ENVELOPE_CLAIM",
    targetCount: 1,
    rewardXp: 0,
    rewardCoins: 25,
    isEnabled: true
  },
  {
    challengeKey: "training-hall-regular",
    title: "Training Hall Regular",
    description: "Complete one Training Hall battle this week.",
    activityType: "TRAINING_HALL_BATTLE",
    targetCount: 1,
    rewardXp: 35,
    rewardCoins: 10,
    isEnabled: true
  }
];

export const DEFAULT_BADGES: Array<
  Omit<BadgeDefinitionRecord, "id" | "createdAt" | "updatedAt">
> = [
  {
    badgeKey: "weekly-starter",
    title: "Weekly Starter",
    description: "Complete at least one LionDen weekly challenge.",
    isEnabled: true
  }
];

export const getWeeklyChallengeWeekKey = (date: Date): string => {
  const utcDate = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const weekYear = utcDate.getUTCFullYear();
  const yearStart = new Date(Date.UTC(weekYear, 0, 1));
  const weekNumber = Math.ceil(
    ((utcDate.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7
  );

  return `${weekYear}-W${String(weekNumber).padStart(2, "0")}`;
};

export const syncDefaultWeeklyChallengeData = async (
  store: Pick<WeeklyChallengeStore, "weeklyChallengeDefinition" | "badgeDefinition">
): Promise<void> => {
  await Promise.all([
    ...DEFAULT_WEEKLY_CHALLENGES.map((challenge) =>
      store.weeklyChallengeDefinition.upsert({
        where: {
          challengeKey: challenge.challengeKey
        },
        create: challenge,
        update: challenge
      })
    ),
    ...DEFAULT_BADGES.map((badge) =>
      store.badgeDefinition.upsert({
        where: {
          badgeKey: badge.badgeKey
        },
        create: badge,
        update: badge
      })
    )
  ]);
};

const applyChallengeRewards = async (
  store: Pick<WeeklyChallengeStore, "userProfile">,
  input: {
    guildId: string;
    userId: string;
    displayName: string;
    rewardXp: number;
    rewardCoins: number;
  }
): Promise<void> => {
  if (input.rewardXp > 0) {
    await adjustXp(store, {
      guildId: input.guildId,
      userId: input.userId,
      displayName: input.displayName,
      delta: input.rewardXp
    });
  }

  if (input.rewardCoins > 0) {
    await adjustCoins(store, {
      guildId: input.guildId,
      userId: input.userId,
      displayName: input.displayName,
      delta: input.rewardCoins
    });
  }
};

const awardStarterBadge = async (
  store: Pick<WeeklyChallengeStore, "userBadge">,
  input: {
    guildId: string;
    userId: string;
    now: Date;
  }
): Promise<UserBadgeRecord> => {
  return store.userBadge.upsert({
    where: {
      guildId_userId_badgeKey: {
        guildId: input.guildId,
        userId: input.userId,
        badgeKey: "weekly-starter"
      }
    },
    create: {
      guildId: input.guildId,
      userId: input.userId,
      badgeKey: "weekly-starter",
      awardedAt: input.now
    },
    update: {}
  });
};

const applyCompletionRewards = async (
  store: Pick<WeeklyChallengeStore, "userProfile" | "userBadge">,
  input: {
    guildId: string;
    userId: string;
    displayName: string;
    definition: WeeklyChallengeDefinitionRecord;
    progress: UserWeeklyChallengeProgressRecord;
    now: Date;
  }
): Promise<UserWeeklyChallengeProgressRecord> => {
  if (!input.progress.completedAt || input.progress.rewardedAt) {
    return input.progress;
  }

  await applyChallengeRewards(store, {
    guildId: input.guildId,
    userId: input.userId,
    displayName: input.displayName,
    rewardXp: input.definition.rewardXp,
    rewardCoins: input.definition.rewardCoins
  });
  await awardStarterBadge(store, {
    guildId: input.guildId,
    userId: input.userId,
    now: input.now
  });

  return input.progress;
};

export const recordWeeklyChallengeProgress = async (
  store: WeeklyChallengeStore,
  input: {
    guildId: string;
    userId: string;
    displayName: string;
    activityType: WeeklyChallengeActivityTypeValue;
    amount?: number;
    occurredAt: Date;
  }
): Promise<UserWeeklyChallengeProgressRecord[]> => {
  await syncDefaultWeeklyChallengeData(store);

  const amount = Math.max(1, Math.floor(input.amount ?? 1));
  const weekKey = getWeeklyChallengeWeekKey(input.occurredAt);
  const definitions = await store.weeklyChallengeDefinition.findMany({
    where: {
      activityType: input.activityType,
      isEnabled: true
    },
    orderBy: [{ challengeKey: "asc" }]
  });
  const updates: UserWeeklyChallengeProgressRecord[] = [];

  for (const definition of definitions) {
    const existing = await store.userWeeklyChallengeProgress.findUnique({
      where: {
        guildId_userId_challengeKey_weekKey: {
          guildId: input.guildId,
          userId: input.userId,
          challengeKey: definition.challengeKey,
          weekKey
        }
      }
    });

    if (existing?.completedAt) {
      const rewardedProgress = await applyCompletionRewards(store, {
        guildId: input.guildId,
        userId: input.userId,
        displayName: input.displayName,
        definition,
        progress: existing,
        now: input.occurredAt
      });

      updates.push(
        rewardedProgress.rewardedAt
          ? rewardedProgress
          : await store.userWeeklyChallengeProgress.update({
              where: {
                id: rewardedProgress.id
              },
              data: {
                rewardedAt: input.occurredAt
              }
            })
      );
      continue;
    }

    const progressCount = Math.min(
      definition.targetCount,
      (existing?.progressCount ?? 0) + amount
    );
    const completedAt =
      progressCount >= definition.targetCount ? input.occurredAt : null;
    const progress = existing
      ? await store.userWeeklyChallengeProgress.update({
          where: {
            id: existing.id
          },
          data: {
            progressCount,
            completedAt
          }
        })
      : await store.userWeeklyChallengeProgress.create({
          data: {
            guildId: input.guildId,
            userId: input.userId,
            challengeKey: definition.challengeKey,
            weekKey,
            progressCount,
            completedAt
          }
        });

    const rewardedProgress = await applyCompletionRewards(store, {
      guildId: input.guildId,
      userId: input.userId,
      displayName: input.displayName,
      definition,
      progress,
      now: input.occurredAt
    });

    if (rewardedProgress.completedAt && !rewardedProgress.rewardedAt) {
      updates.push(
        await store.userWeeklyChallengeProgress.update({
          where: {
            id: rewardedProgress.id
          },
          data: {
            rewardedAt: input.occurredAt
          }
        })
      );
      continue;
    }

    updates.push(rewardedProgress);
  }

  return updates;
};

export const getUserWeeklyChallengeView = async (
  store: Pick<
    WeeklyChallengeStore,
    "weeklyChallengeDefinition" | "userWeeklyChallengeProgress" | "badgeDefinition"
  >,
  input: {
    guildId: string;
    userId: string;
    now: Date;
  }
): Promise<{
  weekKey: string;
  challenges: WeeklyChallengeViewEntry[];
}> => {
  await syncDefaultWeeklyChallengeData(store);

  const weekKey = getWeeklyChallengeWeekKey(input.now);
  const [definitions, progressRecords] = await Promise.all([
    store.weeklyChallengeDefinition.findMany({
      where: {
        isEnabled: true
      },
      orderBy: [{ challengeKey: "asc" }]
    }),
    store.userWeeklyChallengeProgress.findMany({
      where: {
        guildId: input.guildId,
        userId: input.userId,
        weekKey
      }
    })
  ]);
  const progressByChallengeKey = new Map(
    progressRecords.map((progress) => [progress.challengeKey, progress])
  );

  return {
    weekKey,
    challenges: definitions.map((definition) => {
      const progress = progressByChallengeKey.get(definition.challengeKey) ?? null;
      const progressCount = progress?.progressCount ?? 0;

      return {
        definition,
        progress,
        progressCount,
        isCompleted: Boolean(progress?.completedAt)
      };
    })
  };
};

export const getUserBadgeView = async (
  store: Pick<WeeklyChallengeStore, "badgeDefinition" | "userBadge">,
  input: {
    guildId: string;
    userId: string;
  }
): Promise<UserBadgeViewEntry[]> => {
  const [definitions, badges] = await Promise.all([
    store.badgeDefinition.findMany({
      where: {
        isEnabled: true
      },
      orderBy: [{ badgeKey: "asc" }]
    }),
    store.userBadge.findMany({
      where: {
        guildId: input.guildId,
        userId: input.userId
      },
      orderBy: [{ awardedAt: "desc" }]
    })
  ]);
  const definitionByBadgeKey = new Map(
    definitions.map((definition) => [definition.badgeKey, definition])
  );

  return badges.map((badge) => ({
    badge,
    definition: definitionByBadgeKey.get(badge.badgeKey) ?? null
  }));
};

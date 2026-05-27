import { logger } from "../../lib/logger.js";
import type {
  BadgeDefinitionRecord,
  UserBadgeRecord
} from "../challenges/weekly-challenge.service.js";
import { getWeeklyChallengeWeekKey } from "../challenges/weekly-challenge.service.js";
import {
  getUserPracticeStreaks,
  type PracticeAttendanceStore
} from "./practice-attendance.service.js";
import type { PracticeCheckInRecord, PracticeSessionRecord } from "./practice.service.js";

export interface PracticeBadgeDefinition
  extends Omit<BadgeDefinitionRecord, "id" | "createdAt" | "updatedAt"> {
  criteria: string;
}

export interface PracticeBadgeViewEntry {
  badge: UserBadgeRecord;
  definition: BadgeDefinitionRecord | null;
}

export interface PracticeBadgeAwardResult {
  badgeKey: string;
  outcome: "awarded" | "already_awarded" | "definition_disabled";
  award: UserBadgeRecord | null;
}

export interface PracticeBadgeAwardSummary {
  attempted: number;
  awarded: number;
  alreadyAwarded: number;
  skipped: number;
  results: PracticeBadgeAwardResult[];
}

export interface PracticeBadgeBackfillSummary {
  definitionsSynced: number;
  usersEvaluated: number;
  awarded: number;
  alreadyAwarded: number;
  skipped: number;
}

export interface PracticeBadgeStore extends PracticeAttendanceStore {
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
        isEnabled?: boolean;
      };
    }): Promise<BadgeDefinitionRecord>;
    findUnique(args: {
      where: {
        badgeKey: string;
      };
    }): Promise<BadgeDefinitionRecord | null>;
    findMany(args?: {
      where?: {
        badgeKey?: {
          in: string[];
        };
        isEnabled?: boolean;
      };
      orderBy?: Array<{
        badgeKey?: "asc" | "desc";
      }>;
    }): Promise<BadgeDefinitionRecord[]>;
    count?(args: {
      where: {
        badgeKey?: {
          in: string[];
        };
        isEnabled?: boolean;
      };
    }): Promise<number>;
  };
  userBadge: {
    findUnique(args: {
      where: {
        guildId_userId_badgeKey: {
          guildId: string;
          userId: string;
          badgeKey: string;
        };
      };
    }): Promise<UserBadgeRecord | null>;
    findMany(args: {
      where: {
        guildId: string;
        userId?: string;
        badgeKey?: {
          in: string[];
        };
      };
      orderBy?: Array<{
        awardedAt?: "asc" | "desc";
      }>;
    }): Promise<UserBadgeRecord[]>;
    create(args: {
      data: {
        guildId: string;
        userId: string;
        badgeKey: string;
        awardedAt: Date;
      };
    }): Promise<UserBadgeRecord>;
  };
}

export const DEFAULT_PRACTICE_BADGE_DEFINITIONS: PracticeBadgeDefinition[] = [
  {
    badgeKey: "first-practice",
    title: "First Practice",
    description: "Attend your first completed LionDen practice.",
    criteria: "Attend at least 1 completed practice.",
    isEnabled: true
  },
  {
    badgeKey: "three-practice-streak",
    title: "Three Practice Streak",
    description: "Attend 3 completed practices in a row.",
    criteria: "Reach a 3-practice attendance streak.",
    isEnabled: true
  },
  {
    badgeKey: "five-practice-streak",
    title: "Five Practice Streak",
    description: "Attend 5 completed practices in a row.",
    criteria: "Reach a 5-practice attendance streak.",
    isEnabled: true
  },
  {
    badgeKey: "perfect-week",
    title: "Perfect Week",
    description: "Attend every completed practice in a calendar week.",
    criteria: "Attend every completed practice in a week with at least 1 practice.",
    isEnabled: true
  },
  {
    badgeKey: "practice-regular",
    title: "Practice Regular",
    description: "Attend 10 completed practices.",
    criteria: "Attend at least 10 completed practices.",
    isEnabled: true
  },
  {
    badgeKey: "practice-veteran",
    title: "Practice Veteran",
    description: "Attend 25 completed practices.",
    criteria: "Attend at least 25 completed practices.",
    isEnabled: true
  }
];

const PRACTICE_BADGE_KEYS = DEFAULT_PRACTICE_BADGE_DEFINITIONS.map(
  (definition) => definition.badgeKey
);

const getCompletedSessions = async (
  store: PracticeBadgeStore,
  input: {
    guildId: string;
    now: Date;
  }
): Promise<PracticeSessionRecord[]> =>
  store.practiceSession.findMany({
    where: {
      guildId: input.guildId,
      status: "ENDED",
      endedAt: {
        lte: input.now
      }
    },
    orderBy: [{ endedAt: "asc" }, { startedAt: "asc" }]
  });

const getUserCheckIns = async (
  store: PracticeBadgeStore,
  input: {
    guildId: string;
    userId: string;
  }
): Promise<PracticeCheckInRecord[]> =>
  store.practiceCheckIn.findMany({
    where: {
      guildId: input.guildId,
      userId: input.userId
    },
    orderBy: [{ updatedAt: "asc" }]
  });

const hasPerfectWeek = (
  sessions: PracticeSessionRecord[],
  checkIns: PracticeCheckInRecord[]
): boolean => {
  const checkInBySessionId = new Map(
    checkIns.map((checkIn) => [checkIn.sessionId, checkIn])
  );
  const sessionsByWeek = new Map<string, PracticeSessionRecord[]>();

  for (const session of sessions) {
    const date = session.endedAt ?? session.scheduledStartAt ?? session.startedAt;
    const weekKey = getWeeklyChallengeWeekKey(date);
    const weekSessions = sessionsByWeek.get(weekKey) ?? [];
    weekSessions.push(session);
    sessionsByWeek.set(weekKey, weekSessions);
  }

  return [...sessionsByWeek.values()].some(
    (weekSessions) =>
      weekSessions.length > 0 &&
      weekSessions.every(
        (session) => checkInBySessionId.get(session.id)?.attendanceStatus === "HERE"
      )
  );
};

export const isPracticeBadgeKey = (badgeKey: string): boolean =>
  PRACTICE_BADGE_KEYS.includes(badgeKey);

export const syncDefaultPracticeBadgeDefinitions = async (
  store: Pick<PracticeBadgeStore, "badgeDefinition">
): Promise<BadgeDefinitionRecord[]> => {
  const definitions = await Promise.all(
    DEFAULT_PRACTICE_BADGE_DEFINITIONS.map((definition) => {
      const badgeDefinition = {
        badgeKey: definition.badgeKey,
        title: definition.title,
        description: definition.description,
        isEnabled: definition.isEnabled
      };

      return store.badgeDefinition.upsert({
        where: {
          badgeKey: definition.badgeKey
        },
        create: badgeDefinition,
        update: {
          title: badgeDefinition.title,
          description: badgeDefinition.description
        }
      });
    })
  );

  logger.info("Practice badge definitions synced", {
    badgeCount: definitions.length
  });

  return definitions;
};

export const listPracticeBadgeDefinitions = async (
  store: Pick<PracticeBadgeStore, "badgeDefinition">,
  input: {
    enabledOnly?: boolean;
  } = {}
): Promise<BadgeDefinitionRecord[]> =>
  store.badgeDefinition.findMany({
    where: {
      badgeKey: {
        in: PRACTICE_BADGE_KEYS
      },
      isEnabled: input.enabledOnly ? true : undefined
    },
    orderBy: [{ badgeKey: "asc" }]
  });

export const evaluateUserPracticeBadgeEligibility = async (
  store: PracticeBadgeStore,
  input: {
    guildId: string;
    userId: string;
    now: Date;
  }
): Promise<string[]> => {
  const [streaks, sessions, checkIns] = await Promise.all([
    getUserPracticeStreaks(store, input),
    getCompletedSessions(store, input),
    getUserCheckIns(store, input)
  ]);
  const eligibleBadgeKeys: string[] = [];

  if (streaks.totalAttended >= 1) {
    eligibleBadgeKeys.push("first-practice");
  }

  if (streaks.currentStreak >= 3 || streaks.longestStreak >= 3) {
    eligibleBadgeKeys.push("three-practice-streak");
  }

  if (streaks.currentStreak >= 5 || streaks.longestStreak >= 5) {
    eligibleBadgeKeys.push("five-practice-streak");
  }

  if (hasPerfectWeek(sessions, checkIns)) {
    eligibleBadgeKeys.push("perfect-week");
  }

  if (streaks.totalAttended >= 10) {
    eligibleBadgeKeys.push("practice-regular");
  }

  if (streaks.totalAttended >= 25) {
    eligibleBadgeKeys.push("practice-veteran");
  }

  return eligibleBadgeKeys;
};

export const awardPracticeBadge = async (
  store: Pick<PracticeBadgeStore, "badgeDefinition" | "userBadge">,
  input: {
    guildId: string;
    userId: string;
    badgeKey: string;
    awardedAt: Date;
  }
): Promise<PracticeBadgeAwardResult> => {
  const definition = await store.badgeDefinition.findUnique({
    where: {
      badgeKey: input.badgeKey
    }
  });

  if (!definition?.isEnabled) {
    return {
      badgeKey: input.badgeKey,
      outcome: "definition_disabled",
      award: null
    };
  }

  const existingAward = await store.userBadge.findUnique({
    where: {
      guildId_userId_badgeKey: {
        guildId: input.guildId,
        userId: input.userId,
        badgeKey: input.badgeKey
      }
    }
  });

  if (existingAward) {
    return {
      badgeKey: input.badgeKey,
      outcome: "already_awarded",
      award: existingAward
    };
  }

  const award = await store.userBadge.create({
    data: {
      guildId: input.guildId,
      userId: input.userId,
      badgeKey: input.badgeKey,
      awardedAt: input.awardedAt
    }
  });

  logger.info("Practice badge awarded", {
    guildId: input.guildId,
    userId: input.userId,
    badgeKey: input.badgeKey
  });

  return {
    badgeKey: input.badgeKey,
    outcome: "awarded",
    award
  };
};

export const getPracticeBadgeAwardSummary = (
  results: PracticeBadgeAwardResult[]
): PracticeBadgeAwardSummary => ({
  attempted: results.length,
  awarded: results.filter((result) => result.outcome === "awarded").length,
  alreadyAwarded: results.filter((result) => result.outcome === "already_awarded")
    .length,
  skipped: results.filter((result) => result.outcome === "definition_disabled").length,
  results
});

export const awardPracticeBadgesForUser = async (
  store: PracticeBadgeStore,
  input: {
    guildId: string;
    userId: string;
    now: Date;
  }
): Promise<PracticeBadgeAwardSummary> => {
  await syncDefaultPracticeBadgeDefinitions(store);

  const eligibleBadgeKeys = await evaluateUserPracticeBadgeEligibility(store, input);
  const results = await Promise.all(
    eligibleBadgeKeys.map((badgeKey) =>
      awardPracticeBadge(store, {
        guildId: input.guildId,
        userId: input.userId,
        badgeKey,
        awardedAt: input.now
      })
    )
  );

  return getPracticeBadgeAwardSummary(results);
};

export const evaluateCompletedPracticeBadgeAwards = async (
  store: PracticeBadgeStore,
  input: {
    guildId: string;
    practiceId: string;
  }
): Promise<string[]> => {
  const checkIns = await store.practiceCheckIn.findMany({
    where: {
      guildId: input.guildId,
      sessionId: input.practiceId,
      attendanceStatus: "HERE"
    },
    orderBy: [{ updatedAt: "asc" }]
  });

  return [...new Set(checkIns.map((checkIn) => checkIn.userId))];
};

export const awardPracticeBadgesForCompletedSession = async (
  store: PracticeBadgeStore,
  input: {
    guildId: string;
    practiceId: string;
    now: Date;
  }
): Promise<PracticeBadgeBackfillSummary> => {
  const userIds = await evaluateCompletedPracticeBadgeAwards(store, input);
  let awarded = 0;
  let alreadyAwarded = 0;
  let skipped = 0;

  for (const userId of userIds) {
    const summary = await awardPracticeBadgesForUser(store, {
      guildId: input.guildId,
      userId,
      now: input.now
    });

    awarded += summary.awarded;
    alreadyAwarded += summary.alreadyAwarded;
    skipped += summary.skipped;
  }

  return {
    definitionsSynced: DEFAULT_PRACTICE_BADGE_DEFINITIONS.length,
    usersEvaluated: userIds.length,
    awarded,
    alreadyAwarded,
    skipped
  };
};

export const backfillPracticeBadges = async (
  store: PracticeBadgeStore,
  input: {
    guildId: string;
    now: Date;
  }
): Promise<PracticeBadgeBackfillSummary> => {
  await syncDefaultPracticeBadgeDefinitions(store);

  const attendedCheckIns = await store.practiceCheckIn.findMany({
    where: {
      guildId: input.guildId,
      attendanceStatus: "HERE"
    },
    orderBy: [{ updatedAt: "asc" }]
  });
  const userIds = [...new Set(attendedCheckIns.map((checkIn) => checkIn.userId))];
  let awarded = 0;
  let alreadyAwarded = 0;
  let skipped = 0;

  for (const userId of userIds) {
    const summary = await awardPracticeBadgesForUser(store, {
      guildId: input.guildId,
      userId,
      now: input.now
    });

    awarded += summary.awarded;
    alreadyAwarded += summary.alreadyAwarded;
    skipped += summary.skipped;
  }

  logger.info("Practice badge backfill completed", {
    guildId: input.guildId,
    usersEvaluated: userIds.length,
    awarded,
    alreadyAwarded,
    skipped
  });

  return {
    definitionsSynced: DEFAULT_PRACTICE_BADGE_DEFINITIONS.length,
    usersEvaluated: userIds.length,
    awarded,
    alreadyAwarded,
    skipped
  };
};

export const listUserPracticeBadges = async (
  store: Pick<PracticeBadgeStore, "badgeDefinition" | "userBadge">,
  input: {
    guildId: string;
    userId: string;
  }
): Promise<PracticeBadgeViewEntry[]> => {
  const [definitions, badges] = await Promise.all([
    listPracticeBadgeDefinitions(store),
    store.userBadge.findMany({
      where: {
        guildId: input.guildId,
        userId: input.userId,
        badgeKey: {
          in: PRACTICE_BADGE_KEYS
        }
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

export const isPracticeBadgeStore = (store: unknown): store is PracticeBadgeStore => {
  const candidate = store as Partial<PracticeBadgeStore> | null;

  return Boolean(
    candidate?.practiceSession &&
      candidate.practiceCheckIn &&
      candidate.badgeDefinition &&
      candidate.userBadge
  );
};

export const awardPracticeBadgesForCompletedSessionSafely = async (
  store: unknown,
  input: {
    guildId: string;
    practiceId: string;
    now: Date;
  }
): Promise<void> => {
  if (!isPracticeBadgeStore(store)) {
    return;
  }

  try {
    const summary = await awardPracticeBadgesForCompletedSession(store, input);

    logger.info("Practice badge awards processed", {
      guildId: input.guildId,
      practiceId: input.practiceId,
      usersEvaluated: summary.usersEvaluated,
      awarded: summary.awarded,
      alreadyAwarded: summary.alreadyAwarded,
      skipped: summary.skipped
    });
  } catch (error) {
    logger.warn("Practice badge awarding failed", {
      guildId: input.guildId,
      practiceId: input.practiceId,
      error
    });
  }
};

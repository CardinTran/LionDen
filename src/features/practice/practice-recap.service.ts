import type {
  HousePointLedgerRecord,
  HouseRecord,
  HousePointSourceTypeValue
} from "../houses/house.service.js";
import {
  getUserPracticeStreaks,
  type PracticeAttendanceStore
} from "./practice-attendance.service.js";
import {
  PRACTICE_ATTENDANCE_XP,
  type PracticeCheckInRecord,
  type PracticeSessionRecord
} from "./practice.service.js";

export interface PracticeRecapAttendanceSummary {
  attended: number;
  notHere: number;
  noResponse: number;
  trackedResponses: number;
}

export interface PracticeRecapRewardSummary {
  rewardedCount: number;
  xpPerMember: number | null;
  totalXpAwarded: number;
}

export interface PracticeRecapHousePointEntry {
  houseId: string;
  houseName: string;
  houseEmoji: string | null;
  points: number;
}

export interface PracticeRecapStreakHighlight {
  userId: string;
  displayName: string;
  currentStreak: number;
}

export interface PracticeRecap {
  session: PracticeSessionRecord;
  sessionLabel: string;
  attendance: PracticeRecapAttendanceSummary;
  rewards: PracticeRecapRewardSummary;
  housePoints: PracticeRecapHousePointEntry[];
  streakHighlights: PracticeRecapStreakHighlight[];
}

export interface PracticeRecapStore extends PracticeAttendanceStore {
  practiceSession: PracticeAttendanceStore["practiceSession"] & {
    findFirst(args: {
      where: {
        guildId: string;
        status: "ENDED";
        endedAt: {
          lte: Date;
        };
      };
      orderBy: Array<{
        endedAt?: "asc" | "desc";
        startedAt?: "asc" | "desc";
      }>;
    }): Promise<PracticeSessionRecord | null>;
    findUnique(args: {
      where: {
        id: string;
      };
    }): Promise<PracticeSessionRecord | null>;
  };
  house?: {
    findMany(args: {
      where: {
        guildId: string;
      };
      orderBy?: Array<{
        houseKey?: "asc" | "desc";
        name?: "asc" | "desc";
      }>;
    }): Promise<HouseRecord[]>;
  };
  housePointLedger?: {
    findMany(args: {
      where: {
        guildId: string;
        sourceType?: HousePointSourceTypeValue;
        sourceId?: {
          startsWith: string;
        };
      };
      orderBy?: Array<{
        createdAt?: "asc" | "desc";
      }>;
    }): Promise<HousePointLedgerRecord[]>;
  };
}

const STREAK_HIGHLIGHT_LIMIT = 3;

const formatSessionDate = (date: Date): string =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);

const getSessionDate = (session: PracticeSessionRecord): Date =>
  session.endedAt ?? session.scheduledStartAt ?? session.startedAt;

export const canGeneratePracticeRecap = (
  session: PracticeSessionRecord | null,
  now: Date
): session is PracticeSessionRecord =>
  Boolean(session?.endedAt && session.status === "ENDED" && session.endedAt <= now);

export const getPracticeRecapSessionLabel = (
  session: PracticeSessionRecord
): string => formatSessionDate(getSessionDate(session));

export const getLatestCompletedPracticeForRecap = async (
  store: Pick<PracticeRecapStore, "practiceSession">,
  input: {
    guildId: string;
    now: Date;
  }
): Promise<PracticeSessionRecord | null> =>
  store.practiceSession.findFirst({
    where: {
      guildId: input.guildId,
      status: "ENDED",
      endedAt: {
        lte: input.now
      }
    },
    orderBy: [{ endedAt: "desc" }, { startedAt: "desc" }]
  });

export const summarizePracticeAttendance = (
  checkIns: PracticeCheckInRecord[]
): PracticeRecapAttendanceSummary => ({
  attended: checkIns.filter((checkIn) => checkIn.attendanceStatus === "HERE").length,
  notHere: checkIns.filter((checkIn) => checkIn.attendanceStatus === "NOT_HERE")
    .length,
  noResponse: checkIns.filter((checkIn) => !checkIn.attendanceStatus).length,
  trackedResponses: checkIns.length
});

export const summarizePracticeRewards = (
  checkIns: PracticeCheckInRecord[]
): PracticeRecapRewardSummary => {
  const rewardedCheckIns = checkIns.filter((checkIn) => checkIn.rewardXp > 0);
  const totalXpAwarded = rewardedCheckIns.reduce(
    (total, checkIn) => total + checkIn.rewardXp,
    0
  );
  const distinctRewards = new Set(
    rewardedCheckIns.map((checkIn) => checkIn.rewardXp)
  );

  return {
    rewardedCount: rewardedCheckIns.length,
    xpPerMember:
      distinctRewards.size === 1
        ? rewardedCheckIns[0]?.rewardXp ?? PRACTICE_ATTENDANCE_XP
        : null,
    totalXpAwarded
  };
};

export const summarizePracticeHousePoints = async (
  store: Pick<PracticeRecapStore, "house" | "housePointLedger">,
  input: {
    guildId: string;
    sessionId: string;
  }
): Promise<PracticeRecapHousePointEntry[]> => {
  if (!store.house || !store.housePointLedger) {
    return [];
  }

  const [houses, ledgers] = await Promise.all([
    store.house.findMany({
      where: {
        guildId: input.guildId
      },
      orderBy: [{ houseKey: "asc" }]
    }),
    store.housePointLedger.findMany({
      where: {
        guildId: input.guildId,
        sourceType: "PRACTICE_ATTENDANCE",
        sourceId: {
          startsWith: `${input.sessionId}:`
        }
      },
      orderBy: [{ createdAt: "asc" }]
    })
  ]);
  const houseById = new Map(houses.map((house) => [house.id, house]));
  const pointsByHouseId = new Map<string, number>();

  for (const ledger of ledgers) {
    pointsByHouseId.set(
      ledger.houseId,
      (pointsByHouseId.get(ledger.houseId) ?? 0) + ledger.points
    );
  }

  return [...pointsByHouseId.entries()]
    .map(([houseId, points]) => {
      const house = houseById.get(houseId);

      return {
        houseId,
        houseName: house?.name ?? "Unknown House",
        houseEmoji: house?.emoji ?? null,
        points
      };
    })
    .sort((first, second) => {
      const pointDelta = second.points - first.points;
      return pointDelta !== 0
        ? pointDelta
        : first.houseName.localeCompare(second.houseName);
    });
};

export const summarizePracticeStreakHighlights = async (
  store: PracticeRecapStore,
  input: {
    guildId: string;
    now: Date;
    checkIns: PracticeCheckInRecord[];
  }
): Promise<PracticeRecapStreakHighlight[]> => {
  const attendedCheckIns = input.checkIns.filter(
    (checkIn) => checkIn.attendanceStatus === "HERE"
  );
  const highlights = await Promise.all(
    attendedCheckIns.map(async (checkIn) => {
      const streaks = await getUserPracticeStreaks(store, {
        guildId: input.guildId,
        userId: checkIn.userId,
        now: input.now
      });

      return {
        userId: checkIn.userId,
        displayName: checkIn.displayName,
        currentStreak: streaks.currentStreak
      };
    })
  );

  return highlights
    .filter((highlight) => highlight.currentStreak >= 2)
    .sort((first, second) => {
      const streakDelta = second.currentStreak - first.currentStreak;
      return streakDelta !== 0
        ? streakDelta
        : first.userId.localeCompare(second.userId);
    })
    .slice(0, STREAK_HIGHLIGHT_LIMIT);
};

export const buildPracticeRecap = async (
  store: PracticeRecapStore,
  input: {
    guildId: string;
    session: PracticeSessionRecord;
    now: Date;
  }
): Promise<PracticeRecap> => {
  const checkIns = await store.practiceCheckIn.findMany({
    where: {
      guildId: input.guildId,
      sessionId: input.session.id
    },
    orderBy: [{ updatedAt: "asc" }]
  });

  return {
    session: input.session,
    sessionLabel: getPracticeRecapSessionLabel(input.session),
    attendance: summarizePracticeAttendance(checkIns),
    rewards: summarizePracticeRewards(checkIns),
    housePoints: await summarizePracticeHousePoints(store, {
      guildId: input.guildId,
      sessionId: input.session.id
    }),
    streakHighlights: await summarizePracticeStreakHighlights(store, {
      guildId: input.guildId,
      now: input.now,
      checkIns
    })
  };
};

export const getPracticeRecapForSession = async (
  store: PracticeRecapStore,
  input: {
    guildId: string;
    sessionId: string;
    now: Date;
  }
): Promise<PracticeRecap | null> => {
  const session = await store.practiceSession.findUnique({
    where: {
      id: input.sessionId
    }
  });

  if (!session || session.guildId !== input.guildId) {
    return null;
  }

  if (!canGeneratePracticeRecap(session, input.now)) {
    return null;
  }

  return buildPracticeRecap(store, {
    guildId: input.guildId,
    session,
    now: input.now
  });
};

export const getLatestPracticeRecap = async (
  store: PracticeRecapStore,
  input: {
    guildId: string;
    now: Date;
  }
): Promise<PracticeRecap | null> => {
  const session = await getLatestCompletedPracticeForRecap(store, input);

  if (!session || !canGeneratePracticeRecap(session, input.now)) {
    return null;
  }

  return buildPracticeRecap(store, {
    guildId: input.guildId,
    session,
    now: input.now
  });
};

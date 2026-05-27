import type {
  PracticeAttendanceStatus,
  PracticeCheckInRecord,
  PracticeSessionRecord
} from "./practice.service.js";

export type PracticeAttendanceViewStatus =
  | "ATTENDED"
  | "NOT_HERE"
  | "NO_RESPONSE";

export type PracticeAttendancePeriod =
  | "current_month"
  | "last_30_days"
  | "all_time";

export interface PracticeAttendanceHistoryEntry {
  session: PracticeSessionRecord;
  checkIn: PracticeCheckInRecord | null;
  status: PracticeAttendanceViewStatus;
  practiceDate: Date;
  rewardXp: number;
}

export interface PracticeAttendanceSummary {
  attended: number;
  notHere: number;
  noResponse: number;
  totalCompleted: number;
}

export interface PracticeAttendanceStreaks {
  currentStreak: number;
  longestStreak: number;
  totalAttended: number;
  attendedInCurrentMonth: number;
  lastAttendedAt: Date | null;
}

export interface PracticeAttendanceLeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  attendedCount: number;
}

export interface PracticeAttendanceWindow {
  period: PracticeAttendancePeriod;
  label: string;
  start: Date | null;
  end: Date;
}

export interface PracticeAttendanceStore {
  practiceSession: {
    findMany(args: {
      where: {
        guildId: string;
        status: "ENDED";
        endedAt?: {
          gte?: Date;
          lte?: Date;
          lt?: Date;
        };
      };
      orderBy?: Array<{
        endedAt?: "asc" | "desc";
        startedAt?: "asc" | "desc";
      }>;
      take?: number;
    }): Promise<PracticeSessionRecord[]>;
    count?(args: {
      where: {
        guildId: string;
        status: "ENDED";
        endedAt?: {
          gte?: Date;
          lte?: Date;
        };
      };
    }): Promise<number>;
  };
  practiceCheckIn: {
    findMany(args: {
      where: {
        guildId: string;
        userId?: string;
        sessionId?: string | { in: string[] };
        attendanceStatus?: PracticeAttendanceStatus;
      };
      orderBy?: Array<{
        updatedAt?: "asc" | "desc";
      }>;
    }): Promise<PracticeCheckInRecord[]>;
  };
}

const DEFAULT_HISTORY_LIMIT = 10;
const MAX_HISTORY_LIMIT = 25;
const DEFAULT_LEADERBOARD_LIMIT = 10;
const MAX_LEADERBOARD_LIMIT = 25;
const DAY_MS = 86_400_000;

const clampLimit = (
  value: number | null | undefined,
  fallback: number,
  max: number
): number => {
  if (!Number.isInteger(value) || !value || value < 1) {
    return fallback;
  }

  return Math.min(value, max);
};

const getCompletedSessionDate = (session: PracticeSessionRecord): Date =>
  session.endedAt ?? session.scheduledStartAt ?? session.startedAt;

const getMonthStartUtc = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

const getNextMonthStartUtc = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));

const formatMonthLabel = (date: Date): string =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);

export const isPracticeAttendanceStatusAttended = (
  status: PracticeAttendanceViewStatus | PracticeAttendanceStatus | null
): boolean => status === "ATTENDED" || status === "HERE";

export const getPracticeAttendanceStatusLabel = (
  status: PracticeAttendanceViewStatus
): string => {
  switch (status) {
    case "ATTENDED":
      return "Attended";
    case "NOT_HERE":
      return "Not Here";
    case "NO_RESPONSE":
      return "No Response";
  }
};

export const getPracticeAttendanceWindow = (
  period: PracticeAttendancePeriod,
  now: Date
): PracticeAttendanceWindow => {
  if (period === "last_30_days") {
    return {
      period,
      label: "Last 30 Days",
      start: new Date(now.getTime() - 30 * DAY_MS),
      end: now
    };
  }

  if (period === "all_time") {
    return {
      period,
      label: "All Time",
      start: null,
      end: now
    };
  }

  return {
    period,
    label: formatMonthLabel(now),
    start: getMonthStartUtc(now),
    end: getNextMonthStartUtc(now)
  };
};

const getCompletedPracticeSessions = async (
  store: Pick<PracticeAttendanceStore, "practiceSession">,
  input: {
    guildId: string;
    now: Date;
    period?: PracticeAttendancePeriod;
    order?: "asc" | "desc";
    take?: number;
  }
): Promise<PracticeSessionRecord[]> => {
  const window = input.period
    ? getPracticeAttendanceWindow(input.period, input.now)
    : {
        start: null,
        end: input.now
      };
  const end = window.end < input.now ? window.end : input.now;

  return store.practiceSession.findMany({
    where: {
      guildId: input.guildId,
      status: "ENDED",
      endedAt: {
        ...(window.start ? { gte: window.start } : {}),
        lte: end
      }
    },
    orderBy: [
      { endedAt: input.order ?? "desc" },
      { startedAt: input.order ?? "desc" }
    ],
    take: input.take
  });
};

const getUserCheckInsBySessionId = async (
  store: Pick<PracticeAttendanceStore, "practiceCheckIn">,
  input: {
    guildId: string;
    userId: string;
    sessionIds: string[];
  }
): Promise<Map<string, PracticeCheckInRecord>> => {
  if (input.sessionIds.length === 0) {
    return new Map();
  }

  const checkIns = await store.practiceCheckIn.findMany({
    where: {
      guildId: input.guildId,
      userId: input.userId,
      sessionId: {
        in: input.sessionIds
      }
    },
    orderBy: [{ updatedAt: "desc" }]
  });

  return new Map(checkIns.map((checkIn) => [checkIn.sessionId, checkIn]));
};

const getEntryStatus = (
  checkIn: PracticeCheckInRecord | null
): PracticeAttendanceViewStatus => {
  if (checkIn?.attendanceStatus === "HERE") {
    return "ATTENDED";
  }

  if (checkIn?.attendanceStatus === "NOT_HERE") {
    return "NOT_HERE";
  }

  return "NO_RESPONSE";
};

const buildHistoryEntries = (
  sessions: PracticeSessionRecord[],
  checkInBySessionId: Map<string, PracticeCheckInRecord>
): PracticeAttendanceHistoryEntry[] =>
  sessions.map((session) => {
    const checkIn = checkInBySessionId.get(session.id) ?? null;

    return {
      session,
      checkIn,
      status: getEntryStatus(checkIn),
      practiceDate: getCompletedSessionDate(session),
      rewardXp: checkIn?.rewardXp ?? 0
    };
  });

export const getUserPracticeAttendanceSummary = (
  entries: PracticeAttendanceHistoryEntry[]
): PracticeAttendanceSummary => ({
  attended: entries.filter((entry) => entry.status === "ATTENDED").length,
  notHere: entries.filter((entry) => entry.status === "NOT_HERE").length,
  noResponse: entries.filter((entry) => entry.status === "NO_RESPONSE").length,
  totalCompleted: entries.length
});

export const listUserPracticeAttendanceHistory = async (
  store: PracticeAttendanceStore,
  input: {
    guildId: string;
    userId: string;
    now: Date;
    limit?: number | null;
  }
): Promise<{
  entries: PracticeAttendanceHistoryEntry[];
  summary: PracticeAttendanceSummary;
  limit: number;
}> => {
  const limit = clampLimit(input.limit, DEFAULT_HISTORY_LIMIT, MAX_HISTORY_LIMIT);
  const sessions = await getCompletedPracticeSessions(store, {
    guildId: input.guildId,
    now: input.now,
    order: "desc",
    take: limit
  });
  const checkInBySessionId = await getUserCheckInsBySessionId(store, {
    guildId: input.guildId,
    userId: input.userId,
    sessionIds: sessions.map((session) => session.id)
  });
  const entries = buildHistoryEntries(sessions, checkInBySessionId);

  return {
    entries,
    summary: getUserPracticeAttendanceSummary(entries),
    limit
  };
};

export const calculatePracticeAttendanceStreaks = (
  entriesAscending: PracticeAttendanceHistoryEntry[],
  now: Date
): PracticeAttendanceStreaks => {
  let currentStreak = 0;
  let longestStreak = 0;
  let runningStreak = 0;
  let totalAttended = 0;
  let lastAttendedAt: Date | null = null;
  const monthWindow = getPracticeAttendanceWindow("current_month", now);
  let attendedInCurrentMonth = 0;

  for (const entry of entriesAscending) {
    if (entry.status === "ATTENDED") {
      runningStreak += 1;
      longestStreak = Math.max(longestStreak, runningStreak);
      totalAttended += 1;
      lastAttendedAt = entry.practiceDate;

      if (
        monthWindow.start &&
        entry.practiceDate >= monthWindow.start &&
        entry.practiceDate < monthWindow.end
      ) {
        attendedInCurrentMonth += 1;
      }
    } else {
      runningStreak = 0;
    }
  }

  for (const entry of [...entriesAscending].reverse()) {
    if (entry.status !== "ATTENDED") {
      break;
    }

    currentStreak += 1;
  }

  return {
    currentStreak,
    longestStreak,
    totalAttended,
    attendedInCurrentMonth,
    lastAttendedAt
  };
};

export const getUserPracticeStreaks = async (
  store: PracticeAttendanceStore,
  input: {
    guildId: string;
    userId: string;
    now: Date;
  }
): Promise<PracticeAttendanceStreaks> => {
  const sessions = await getCompletedPracticeSessions(store, {
    guildId: input.guildId,
    now: input.now,
    order: "asc"
  });
  const checkInBySessionId = await getUserCheckInsBySessionId(store, {
    guildId: input.guildId,
    userId: input.userId,
    sessionIds: sessions.map((session) => session.id)
  });

  return calculatePracticeAttendanceStreaks(
    buildHistoryEntries(sessions, checkInBySessionId),
    input.now
  );
};

export const listPracticeAttendanceLeaderboard = async (
  store: PracticeAttendanceStore,
  input: {
    guildId: string;
    now: Date;
    period?: PracticeAttendancePeriod;
    limit?: number | null;
  }
): Promise<{
  entries: PracticeAttendanceLeaderboardEntry[];
  window: PracticeAttendanceWindow;
  limit: number;
}> => {
  const period = input.period ?? "current_month";
  const limit = clampLimit(
    input.limit,
    DEFAULT_LEADERBOARD_LIMIT,
    MAX_LEADERBOARD_LIMIT
  );
  const window = getPracticeAttendanceWindow(period, input.now);
  const sessions = await getCompletedPracticeSessions(store, {
    guildId: input.guildId,
    now: input.now,
    period,
    order: "asc"
  });
  const sessionIds = sessions.map((session) => session.id);

  if (sessionIds.length === 0) {
    return {
      entries: [],
      window,
      limit
    };
  }

  const checkIns = await store.practiceCheckIn.findMany({
    where: {
      guildId: input.guildId,
      sessionId: {
        in: sessionIds
      },
      attendanceStatus: "HERE"
    },
    orderBy: [{ updatedAt: "desc" }]
  });
  const byUser = new Map<
    string,
    {
      userId: string;
      displayName: string;
      attendedCount: number;
    }
  >();

  for (const checkIn of checkIns) {
    const current = byUser.get(checkIn.userId) ?? {
      userId: checkIn.userId,
      displayName: checkIn.displayName,
      attendedCount: 0
    };
    current.attendedCount += 1;
    byUser.set(checkIn.userId, current);
  }

  const entries = [...byUser.values()]
    .filter((entry) => entry.attendedCount > 0)
    .sort((first, second) => {
      const attendanceDelta = second.attendedCount - first.attendedCount;
      return attendanceDelta !== 0
        ? attendanceDelta
        : first.userId.localeCompare(second.userId);
    })
    .slice(0, limit)
    .map((entry, index) => ({
      rank: index + 1,
      ...entry
    }));

  return {
    entries,
    window,
    limit
  };
};

import { describe, expect, it, vi } from "vitest";

import {
  calculatePracticeAttendanceStreaks,
  getPracticeAttendanceStatusLabel,
  getPracticeAttendanceWindow,
  getUserPracticeStreaks,
  isPracticeAttendanceStatusAttended,
  listPracticeAttendanceLeaderboard,
  listUserPracticeAttendanceHistory,
  type PracticeAttendanceStore
} from "../src/features/practice/practice-attendance.service.js";
import type {
  PracticeAttendanceStatus,
  PracticeCheckInRecord,
  PracticeSessionRecord
} from "../src/features/practice/practice.service.js";

const now = new Date("2026-05-27T12:00:00.000Z");

const buildSession = (
  overrides: Partial<PracticeSessionRecord> = {}
): PracticeSessionRecord => ({
  id: "session_123",
  guildId: "guild_123",
  startedByUserId: "coach_123",
  startedByDisplayName: "Coach",
  announcementChannelId: "channel_123",
  source: "MANUAL",
  scheduledDateKey: null,
  scheduledStartAt: null,
  scheduledEndAt: null,
  rsvpMessageId: null,
  rsvpPostedAt: null,
  attendanceMessageId: null,
  attendancePostedAt: null,
  status: "ENDED",
  startedAt: new Date("2026-05-20T23:00:00.000Z"),
  endedAt: new Date("2026-05-21T01:00:00.000Z"),
  endedByUserId: "coach_123",
  ...overrides
});

const buildCheckIn = (
  overrides: Partial<PracticeCheckInRecord> = {}
): PracticeCheckInRecord => ({
  id: "checkin_123",
  sessionId: "session_123",
  guildId: "guild_123",
  userId: "user_123",
  displayName: "Mira",
  rsvpStatus: null,
  attendanceStatus: "HERE",
  rewardAppliedAt: new Date("2026-05-21T01:00:00.000Z"),
  rewardXp: 30,
  checkedInAt: new Date("2026-05-21T00:00:00.000Z"),
  updatedAt: new Date("2026-05-21T00:00:00.000Z"),
  ...overrides
});

const createStore = (input: {
  sessions: PracticeSessionRecord[];
  checkIns: PracticeCheckInRecord[];
}): PracticeAttendanceStore => ({
  practiceSession: {
    findMany: vi.fn(async ({ where, orderBy, take }) => {
      let result = input.sessions.filter((session) => {
        const endedAt = session.endedAt;

        if (
          session.guildId !== where.guildId ||
          session.status !== where.status ||
          !endedAt
        ) {
          return false;
        }

        if (where.endedAt?.gte && endedAt < where.endedAt.gte) {
          return false;
        }

        if (where.endedAt?.lte && endedAt > where.endedAt.lte) {
          return false;
        }

        if (where.endedAt?.lt && endedAt >= where.endedAt.lt) {
          return false;
        }

        return true;
      });
      const direction = orderBy?.[0]?.endedAt ?? "desc";

      result = result.sort((first, second) => {
        const delta =
          (first.endedAt?.getTime() ?? 0) - (second.endedAt?.getTime() ?? 0);
        return direction === "asc" ? delta : -delta;
      });

      return take ? result.slice(0, take) : result;
    }),
    count: vi.fn()
  },
  practiceCheckIn: {
    findMany: vi.fn(async ({ where }) =>
      input.checkIns.filter((checkIn) => {
        const sessionMatches =
          typeof where.sessionId === "object"
            ? where.sessionId.in.includes(checkIn.sessionId)
            : where.sessionId === undefined ||
              checkIn.sessionId === where.sessionId;

        return (
          checkIn.guildId === where.guildId &&
          sessionMatches &&
          (where.userId === undefined || checkIn.userId === where.userId) &&
          (where.attendanceStatus === undefined ||
            checkIn.attendanceStatus === where.attendanceStatus)
        );
      })
    )
  }
});

const createSessionSeries = () => [
  buildSession({
    id: "session_1",
    endedAt: new Date("2026-05-01T01:00:00.000Z")
  }),
  buildSession({
    id: "session_2",
    endedAt: new Date("2026-05-08T01:00:00.000Z")
  }),
  buildSession({
    id: "session_3",
    endedAt: new Date("2026-05-15T01:00:00.000Z")
  }),
  buildSession({
    id: "session_4",
    endedAt: new Date("2026-05-22T01:00:00.000Z")
  })
];

describe("practice attendance service", () => {
  it("labels and recognizes attended statuses", () => {
    expect(isPracticeAttendanceStatusAttended("ATTENDED")).toBe(true);
    expect(isPracticeAttendanceStatusAttended("HERE")).toBe(true);
    expect(isPracticeAttendanceStatusAttended("NOT_HERE")).toBe(false);
    expect(isPracticeAttendanceStatusAttended(null)).toBe(false);
    expect(getPracticeAttendanceStatusLabel("ATTENDED")).toBe("Attended");
    expect(getPracticeAttendanceStatusLabel("NO_RESPONSE")).toBe("No Response");
  });

  it("builds attendance windows", () => {
    expect(getPracticeAttendanceWindow("current_month", now)).toMatchObject({
      label: "May 2026",
      start: new Date("2026-05-01T00:00:00.000Z"),
      end: new Date("2026-06-01T00:00:00.000Z")
    });
    expect(getPracticeAttendanceWindow("all_time", now).start).toBeNull();
  });

  it("returns recent user history with attended, not here, and no response states", async () => {
    const sessions = createSessionSeries();
    const store = createStore({
      sessions: [
        ...sessions,
        buildSession({
          id: "future",
          endedAt: new Date("2026-06-05T01:00:00.000Z")
        }),
        buildSession({
          id: "active",
          status: "ACTIVE",
          endedAt: null
        })
      ],
      checkIns: [
        buildCheckIn({
          sessionId: "session_1",
          attendanceStatus: "HERE"
        }),
        buildCheckIn({
          sessionId: "session_2",
          attendanceStatus: "NOT_HERE",
          rewardAppliedAt: null,
          rewardXp: 0
        }),
        buildCheckIn({
          sessionId: "session_4",
          attendanceStatus: "HERE"
        })
      ]
    });

    const history = await listUserPracticeAttendanceHistory(store, {
      guildId: "guild_123",
      userId: "user_123",
      now,
      limit: 3
    });

    expect(history.entries.map((entry) => [entry.session.id, entry.status])).toEqual([
      ["session_4", "ATTENDED"],
      ["session_3", "NO_RESPONSE"],
      ["session_2", "NOT_HERE"]
    ]);
    expect(history.summary).toEqual({
      attended: 1,
      notHere: 1,
      noResponse: 1,
      totalCompleted: 3
    });
  });

  it("returns empty history for a user with no completed sessions", async () => {
    const store = createStore({
      sessions: [
        buildSession({
          status: "ACTIVE",
          endedAt: null
        })
      ],
      checkIns: []
    });

    const history = await listUserPracticeAttendanceHistory(store, {
      guildId: "guild_123",
      userId: "user_123",
      now
    });

    expect(history.entries).toEqual([]);
    expect(history.summary.totalCompleted).toBe(0);
  });

  it("sorts leaderboard by attended count and deterministic user id ties", async () => {
    const store = createStore({
      sessions: [
        ...createSessionSeries(),
        buildSession({
          id: "future",
          endedAt: new Date("2026-05-30T01:00:00.000Z")
        })
      ],
      checkIns: [
        buildCheckIn({
          id: "a1",
          sessionId: "session_1",
          userId: "user_b",
          displayName: "B"
        }),
        buildCheckIn({
          id: "a2",
          sessionId: "session_2",
          userId: "user_b",
          displayName: "B"
        }),
        buildCheckIn({
          id: "b1",
          sessionId: "session_1",
          userId: "user_a",
          displayName: "A"
        }),
        buildCheckIn({
          id: "b2",
          sessionId: "session_3",
          userId: "user_a",
          displayName: "A"
        }),
        buildCheckIn({
          id: "c1",
          sessionId: "session_4",
          userId: "user_c",
          displayName: "C",
          attendanceStatus: "NOT_HERE" as PracticeAttendanceStatus
        }),
        buildCheckIn({
          id: "d1",
          sessionId: "future",
          userId: "user_d",
          displayName: "D"
        })
      ]
    });

    const leaderboard = await listPracticeAttendanceLeaderboard(store, {
      guildId: "guild_123",
      now,
      period: "current_month"
    });

    expect(leaderboard.window.label).toBe("May 2026");
    expect(
      leaderboard.entries.map((entry) => [entry.rank, entry.userId, entry.attendedCount])
    ).toEqual([
      [1, "user_a", 2],
      [2, "user_b", 2]
    ]);
  });

  it("calculates current and longest streaks across consecutive completed practices", async () => {
    const store = createStore({
      sessions: createSessionSeries(),
      checkIns: [
        buildCheckIn({
          sessionId: "session_1",
          attendanceStatus: "HERE"
        }),
        buildCheckIn({
          sessionId: "session_2",
          attendanceStatus: "NOT_HERE",
          rewardXp: 0
        }),
        buildCheckIn({
          sessionId: "session_3",
          attendanceStatus: "HERE"
        }),
        buildCheckIn({
          sessionId: "session_4",
          attendanceStatus: "HERE"
        })
      ]
    });

    await expect(
      getUserPracticeStreaks(store, {
        guildId: "guild_123",
        userId: "user_123",
        now
      })
    ).resolves.toEqual({
      currentStreak: 2,
      longestStreak: 2,
      totalAttended: 3,
      attendedInCurrentMonth: 3,
      lastAttendedAt: new Date("2026-05-22T01:00:00.000Z")
    });
  });

  it("resets current streak when the latest completed practice is not attended", async () => {
    const entries = [
      {
        session: createSessionSeries()[0]!,
        checkIn: buildCheckIn(),
        status: "ATTENDED" as const,
        practiceDate: new Date("2026-05-01T01:00:00.000Z"),
        rewardXp: 30
      },
      {
        session: createSessionSeries()[1]!,
        checkIn: buildCheckIn({
          attendanceStatus: "NOT_HERE"
        }),
        status: "NOT_HERE" as const,
        practiceDate: new Date("2026-05-08T01:00:00.000Z"),
        rewardXp: 0
      }
    ];

    expect(calculatePracticeAttendanceStreaks(entries, now)).toMatchObject({
      currentStreak: 0,
      longestStreak: 1,
      totalAttended: 1
    });
  });

  it("handles all attended and alternating attendance streaks", () => {
    const sessions = createSessionSeries();
    const allAttended = sessions.map((session) => ({
      session,
      checkIn: buildCheckIn({
        sessionId: session.id
      }),
      status: "ATTENDED" as const,
      practiceDate: session.endedAt!,
      rewardXp: 30
    }));
    const alternating = allAttended.map((entry, index) => ({
      ...entry,
      status: index % 2 === 0 ? ("ATTENDED" as const) : ("NO_RESPONSE" as const)
    }));

    expect(calculatePracticeAttendanceStreaks(allAttended, now)).toMatchObject({
      currentStreak: 4,
      longestStreak: 4
    });
    expect(calculatePracticeAttendanceStreaks(alternating, now)).toMatchObject({
      currentStreak: 0,
      longestStreak: 1
    });
  });
});

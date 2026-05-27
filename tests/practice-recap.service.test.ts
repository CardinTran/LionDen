import { describe, expect, it, vi } from "vitest";

import type {
  HousePointLedgerRecord,
  HouseRecord
} from "../src/features/houses/house.service.js";
import {
  buildPracticeRecap,
  canGeneratePracticeRecap,
  getLatestPracticeRecap,
  getPracticeRecapForSession,
  summarizePracticeAttendance,
  summarizePracticeRewards,
  type PracticeRecapStore
} from "../src/features/practice/practice-recap.service.js";
import type {
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

const buildHouse = (overrides: Partial<HouseRecord> = {}): HouseRecord => ({
  id: "house_red",
  guildId: "guild_123",
  houseKey: "red",
  name: "Red House",
  description: null,
  emoji: "R",
  color: null,
  isActive: true,
  createdAt: new Date("2026-05-01T00:00:00.000Z"),
  updatedAt: new Date("2026-05-01T00:00:00.000Z"),
  ...overrides
});

const buildLedger = (
  overrides: Partial<HousePointLedgerRecord> = {}
): HousePointLedgerRecord => ({
  id: "ledger_123",
  guildId: "guild_123",
  houseId: "house_red",
  userId: "user_123",
  sourceType: "PRACTICE_ATTENDANCE",
  sourceId: "session_123:user_123",
  points: 10,
  reason: "Practice attendance",
  createdAt: new Date("2026-05-21T01:01:00.000Z"),
  ...overrides
});

const createStore = (input: {
  sessions: PracticeSessionRecord[];
  checkIns: PracticeCheckInRecord[];
  houses?: HouseRecord[];
  ledgers?: HousePointLedgerRecord[];
}): PracticeRecapStore => ({
  practiceSession: {
    findFirst: vi.fn(async ({ where, orderBy }) => {
      const sessions = input.sessions
        .filter(
          (session) =>
            session.guildId === where.guildId &&
            session.status === where.status &&
            session.endedAt &&
            session.endedAt <= where.endedAt.lte
        )
        .sort((first, second) => {
          const delta =
            (first.endedAt?.getTime() ?? 0) - (second.endedAt?.getTime() ?? 0);
          return orderBy[0]?.endedAt === "asc" ? delta : -delta;
        });

      return sessions[0] ?? null;
    }),
    findUnique: vi.fn(async ({ where }) =>
      input.sessions.find((session) => session.id === where.id) ?? null
    ),
    findMany: vi.fn(async ({ where, orderBy, take }) => {
      let sessions = input.sessions.filter((session) => {
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

        return true;
      });
      const direction = orderBy?.[0]?.endedAt ?? "desc";

      sessions = sessions.sort((first, second) => {
        const delta =
          (first.endedAt?.getTime() ?? 0) - (second.endedAt?.getTime() ?? 0);
        return direction === "asc" ? delta : -delta;
      });

      return take ? sessions.slice(0, take) : sessions;
    })
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
  },
  house: {
    findMany: vi.fn(async ({ where }) =>
      (input.houses ?? []).filter((house) => house.guildId === where.guildId)
    )
  },
  housePointLedger: {
    findMany: vi.fn(async ({ where }) =>
      (input.ledgers ?? []).filter(
        (ledger) =>
          ledger.guildId === where.guildId &&
          (where.sourceType === undefined ||
            ledger.sourceType === where.sourceType) &&
          (where.sourceId === undefined ||
            ledger.sourceId?.startsWith(where.sourceId.startsWith))
      )
    )
  }
});

describe("practice recap service", () => {
  it("builds a recap for the latest completed practice", async () => {
    const sessions = [
      buildSession({
        id: "older",
        endedAt: new Date("2026-05-14T01:00:00.000Z")
      }),
      buildSession()
    ];
    const store = createStore({
      sessions,
      checkIns: [
        buildCheckIn(),
        buildCheckIn({
          id: "checkin_2",
          userId: "user_456",
          displayName: "Kai",
          attendanceStatus: "NOT_HERE",
          rewardAppliedAt: null,
          rewardXp: 0
        }),
        buildCheckIn({
          id: "checkin_3",
          userId: "user_789",
          displayName: "Lin",
          attendanceStatus: null,
          rewardAppliedAt: null,
          rewardXp: 0
        })
      ],
      houses: [buildHouse()],
      ledgers: [buildLedger()]
    });

    const recap = await getLatestPracticeRecap(store, {
      guildId: "guild_123",
      now
    });

    expect(recap?.session.id).toBe("session_123");
    expect(recap?.attendance).toEqual({
      attended: 1,
      notHere: 1,
      noResponse: 1,
      trackedResponses: 3
    });
    expect(recap?.rewards).toEqual({
      rewardedCount: 1,
      xpPerMember: 30,
      totalXpAwarded: 30
    });
    expect(recap?.housePoints).toEqual([
      {
        houseId: "house_red",
        houseName: "Red House",
        houseEmoji: "R",
        points: 10
      }
    ]);
  });

  it("builds a recap for an explicit completed session", async () => {
    const store = createStore({
      sessions: [buildSession({ id: "session_456" })],
      checkIns: [
        buildCheckIn({
          sessionId: "session_456"
        })
      ]
    });

    await expect(
      getPracticeRecapForSession(store, {
        guildId: "guild_123",
        sessionId: "session_456",
        now
      })
    ).resolves.toMatchObject({
      session: {
        id: "session_456"
      },
      attendance: {
        attended: 1
      }
    });
  });

  it("does not recap active or future sessions", async () => {
    const activeSession = buildSession({
      status: "ACTIVE",
      endedAt: null
    });
    const futureSession = buildSession({
      id: "future",
      endedAt: new Date("2026-06-01T01:00:00.000Z")
    });
    const store = createStore({
      sessions: [activeSession, futureSession],
      checkIns: []
    });

    expect(canGeneratePracticeRecap(activeSession, now)).toBe(false);
    expect(canGeneratePracticeRecap(futureSession, now)).toBe(false);
    await expect(
      getLatestPracticeRecap(store, {
        guildId: "guild_123",
        now
      })
    ).resolves.toBeNull();
  });

  it("handles no attendance responses without mutating rewards", async () => {
    const store = createStore({
      sessions: [buildSession()],
      checkIns: []
    });

    const recap = await buildPracticeRecap(store, {
      guildId: "guild_123",
      session: buildSession(),
      now
    });

    expect(recap.attendance).toEqual({
      attended: 0,
      notHere: 0,
      noResponse: 0,
      trackedResponses: 0
    });
    expect(recap.rewards.totalXpAwarded).toBe(0);
    expect(recap.housePoints).toEqual([]);
  });

  it("summarizes mixed rewards without assuming a uniform reward value", () => {
    expect(
      summarizePracticeRewards([
        buildCheckIn({
          rewardXp: 30
        }),
        buildCheckIn({
          id: "checkin_2",
          rewardXp: 20
        })
      ])
    ).toEqual({
      rewardedCount: 2,
      xpPerMember: null,
      totalXpAwarded: 50
    });
  });

  it("highlights top current streaks among attendees only", async () => {
    const sessions = [
      buildSession({
        id: "session_1",
        endedAt: new Date("2026-05-07T01:00:00.000Z")
      }),
      buildSession({
        id: "session_2",
        endedAt: new Date("2026-05-14T01:00:00.000Z")
      }),
      buildSession()
    ];
    const store = createStore({
      sessions,
      checkIns: [
        buildCheckIn({ sessionId: "session_1", userId: "user_a", displayName: "A" }),
        buildCheckIn({ sessionId: "session_2", userId: "user_a", displayName: "A" }),
        buildCheckIn({ sessionId: "session_123", userId: "user_a", displayName: "A" }),
        buildCheckIn({ sessionId: "session_2", userId: "user_b", displayName: "B" }),
        buildCheckIn({ sessionId: "session_123", userId: "user_b", displayName: "B" }),
        buildCheckIn({
          sessionId: "session_123",
          userId: "user_c",
          displayName: "C",
          attendanceStatus: "NOT_HERE",
          rewardXp: 0
        })
      ]
    });

    const recap = await buildPracticeRecap(store, {
      guildId: "guild_123",
      session: buildSession(),
      now
    });

    expect(recap.streakHighlights).toEqual([
      {
        userId: "user_a",
        displayName: "A",
        currentStreak: 3
      },
      {
        userId: "user_b",
        displayName: "B",
        currentStreak: 2
      }
    ]);
  });

  it("summarizes attendance categories directly", () => {
    expect(
      summarizePracticeAttendance([
        buildCheckIn(),
        buildCheckIn({
          id: "not_here",
          attendanceStatus: "NOT_HERE"
        }),
        buildCheckIn({
          id: "no_response",
          attendanceStatus: null
        })
      ])
    ).toEqual({
      attended: 1,
      notHere: 1,
      noResponse: 1,
      trackedResponses: 3
    });
  });
});

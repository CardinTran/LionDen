import { describe, expect, it } from "vitest";

import {
  formatPracticeAttendanceHistoryMessage,
  formatPracticeAttendanceLeaderboardMessage,
  formatPracticeStreaksMessage,
  parsePracticeAttendancePeriod
} from "../src/features/practice/practice-attendance-formatting.js";
import type {
  PracticeAttendanceHistoryEntry,
  PracticeAttendanceLeaderboardEntry
} from "../src/features/practice/practice-attendance.service.js";
import type {
  PracticeCheckInRecord,
  PracticeSessionRecord
} from "../src/features/practice/practice.service.js";

const now = new Date("2026-05-22T01:00:00.000Z");

const session: PracticeSessionRecord = {
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
  startedAt: new Date("2026-05-22T00:00:00.000Z"),
  endedAt: now,
  endedByUserId: "coach_123"
};

const checkIn: PracticeCheckInRecord = {
  id: "checkin_123",
  sessionId: "session_123",
  guildId: "guild_123",
  userId: "user_123",
  displayName: "Mira",
  rsvpStatus: null,
  attendanceStatus: "HERE",
  rewardAppliedAt: now,
  rewardXp: 30,
  checkedInAt: now,
  updatedAt: now
};

const historyEntry = (
  overrides: Partial<PracticeAttendanceHistoryEntry> = {}
): PracticeAttendanceHistoryEntry => ({
  session,
  checkIn,
  status: "ATTENDED",
  practiceDate: now,
  rewardXp: 30,
  ...overrides
});

describe("practice attendance formatting", () => {
  it("formats history with neutral attendance labels", () => {
    const output = formatPracticeAttendanceHistoryMessage({
      displayName: "Mira",
      entries: [
        historyEntry(),
        historyEntry({
          status: "NOT_HERE",
          checkIn: {
            ...checkIn,
            attendanceStatus: "NOT_HERE",
            rewardXp: 0
          },
          rewardXp: 0
        }),
        historyEntry({
          status: "NO_RESPONSE",
          checkIn: null,
          rewardXp: 0
        })
      ],
      summary: {
        attended: 1,
        notHere: 1,
        noResponse: 1,
        totalCompleted: 3
      },
      limit: 10
    });

    expect(output).toContain("Practice History for Mira");
    expect(output).toContain("Attended");
    expect(output).toContain("Not Here");
    expect(output).toContain("No Response");
    expect(output).toContain("30 XP awarded");
  });

  it("formats no history and capped history output", () => {
    expect(
      formatPracticeAttendanceHistoryMessage({
        displayName: "Mira",
        entries: [],
        summary: {
          attended: 0,
          notHere: 0,
          noResponse: 0,
          totalCompleted: 0
        },
        limit: 10
      })
    ).toBe("Mira has no completed practice attendance history yet.");

    const entries = Array.from({ length: 30 }, (_, index) =>
      historyEntry({
        practiceDate: new Date(`2026-05-${String(index + 1).padStart(2, "0")}T01:00:00.000Z`)
      })
    );

    expect(
      formatPracticeAttendanceHistoryMessage({
        displayName: "Mira",
        entries,
        summary: {
          attended: 30,
          notHere: 0,
          noResponse: 0,
          totalCompleted: 30
        },
        limit: 30
      })
    ).toContain("Showing fewer practices to keep this readable.");
  });

  it("formats leaderboard data and no-data states", () => {
    const entries: PracticeAttendanceLeaderboardEntry[] = [
      {
        rank: 1,
        userId: "user_123",
        displayName: "Mira",
        attendedCount: 5
      }
    ];

    expect(
      formatPracticeAttendanceLeaderboardMessage({
        entries,
        window: {
          period: "current_month",
          label: "May 2026",
          start: new Date("2026-05-01T00:00:00.000Z"),
          end: new Date("2026-06-01T00:00:00.000Z")
        }
      })
    ).toContain("<@user_123> - 5 practices");
    expect(
      formatPracticeAttendanceLeaderboardMessage({
        entries: [],
        window: {
          period: "current_month",
          label: "May 2026",
          start: new Date("2026-05-01T00:00:00.000Z"),
          end: new Date("2026-06-01T00:00:00.000Z")
        }
      })
    ).toBe("No attended practices are recorded for May 2026.");
  });

  it("formats streaks and parses period options", () => {
    expect(
      formatPracticeStreaksMessage({
        displayName: "Mira",
        streaks: {
          currentStreak: 3,
          longestStreak: 5,
          totalAttended: 12,
          attendedInCurrentMonth: 4,
          lastAttendedAt: now
        }
      })
    ).toContain("Current streak: 3 practices");
    expect(
      formatPracticeStreaksMessage({
        displayName: "Mira",
        streaks: {
          currentStreak: 0,
          longestStreak: 0,
          totalAttended: 0,
          attendedInCurrentMonth: 0,
          lastAttendedAt: null
        }
      })
    ).toBe("Mira has no attended practices recorded yet.");
    expect(parsePracticeAttendancePeriod("last_30_days")).toBe("last_30_days");
    expect(parsePracticeAttendancePeriod("wat")).toBe("current_month");
  });
});

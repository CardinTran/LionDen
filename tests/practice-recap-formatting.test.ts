import { describe, expect, it } from "vitest";

import {
  formatNoPracticeRecapMessage,
  formatPracticeRecapMessage
} from "../src/features/practice/practice-recap-formatting.js";
import type { PracticeRecap } from "../src/features/practice/practice-recap.service.js";
import type { PracticeSessionRecord } from "../src/features/practice/practice.service.js";

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
  startedAt: new Date("2026-05-20T23:00:00.000Z"),
  endedAt: new Date("2026-05-21T01:00:00.000Z"),
  endedByUserId: "coach_123"
};

const buildRecap = (overrides: Partial<PracticeRecap> = {}): PracticeRecap => ({
  session,
  sessionLabel: "May 21, 2026",
  attendance: {
    attended: 2,
    notHere: 1,
    noResponse: 1,
    trackedResponses: 4
  },
  rewards: {
    rewardedCount: 2,
    xpPerMember: 30,
    totalXpAwarded: 60
  },
  housePoints: [
    {
      houseId: "house_red",
      houseName: "Red House",
      houseEmoji: "R",
      points: 20
    }
  ],
  streakHighlights: [
    {
      userId: "user_123",
      displayName: "Mira",
      currentStreak: 3
    }
  ],
  ...overrides
});

describe("practice recap formatting", () => {
  it("formats a full recap with attendance, rewards, House points, and streaks", () => {
    const message = formatPracticeRecapMessage(buildRecap());

    expect(message).toContain("Practice Recap - May 21, 2026");
    expect(message).toContain("Attendance");
    expect(message).toContain("- Attended: 2");
    expect(message).toContain("- Not Here: 1");
    expect(message).toContain("- No Response: 1");
    expect(message).toContain("2 members x 30 XP = 60 XP total");
    expect(message).toContain("R Red House: +20 points");
    expect(message).toContain("<@user_123> - 3-practice streak");
  });

  it("formats empty House point and streak sections without shame language", () => {
    const message = formatPracticeRecapMessage(
      buildRecap({
        housePoints: [],
        streakHighlights: []
      })
    );

    expect(message).toContain("No House practice points recorded");
    expect(message).not.toContain("Streak Highlights");
    expect(message.toLowerCase()).not.toContain("missed");
    expect(message.toLowerCase()).not.toContain("failed");
  });

  it("formats no attendance data clearly", () => {
    const message = formatPracticeRecapMessage(
      buildRecap({
        attendance: {
          attended: 0,
          notHere: 0,
          noResponse: 0,
          trackedResponses: 0
        },
        rewards: {
          rewardedCount: 0,
          xpPerMember: null,
          totalXpAwarded: 0
        },
        housePoints: [],
        streakHighlights: []
      })
    );

    expect(message).toContain("Attendance XP: none recorded");
    expect(message).toContain("No attendance responses were recorded");
  });

  it("caps long House point lists", () => {
    const message = formatPracticeRecapMessage(
      buildRecap({
        housePoints: Array.from({ length: 7 }, (_value, index) => ({
          houseId: `house_${index}`,
          houseName: `House ${index}`,
          houseEmoji: null,
          points: 10 - index
        }))
      })
    );

    expect(message).toContain("Showing the top House point rows only.");
    expect(message).not.toContain("House 6");
  });

  it("formats the no-completed-practice message", () => {
    expect(formatNoPracticeRecapMessage()).toBe(
      "No completed practice session is available for a recap yet."
    );
  });
});

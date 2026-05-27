import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockAutoPostPracticeRecapAfterEnd,
  mockBackfillPracticeBadges,
  mockEndPracticeSession,
  mockGetLatestPracticeRecap,
  mockGetPracticeRecapForSession,
  mockGetUserPracticeStreaks,
  mockListUserPracticeBadges,
  mockListPracticeAttendanceLeaderboard,
  mockListUserPracticeAttendanceHistory
} = vi.hoisted(() => ({
  mockAutoPostPracticeRecapAfterEnd: vi.fn(),
  mockBackfillPracticeBadges: vi.fn(),
  mockEndPracticeSession: vi.fn(),
  mockGetLatestPracticeRecap: vi.fn(),
  mockGetPracticeRecapForSession: vi.fn(),
  mockGetUserPracticeStreaks: vi.fn(),
  mockListUserPracticeBadges: vi.fn(),
  mockListPracticeAttendanceLeaderboard: vi.fn(),
  mockListUserPracticeAttendanceHistory: vi.fn()
}));

vi.mock("../src/features/practice/practice-attendance.service.js", async () => {
  const actual = await vi.importActual<
    typeof import("../src/features/practice/practice-attendance.service.js")
  >("../src/features/practice/practice-attendance.service.js");

  return {
    ...actual,
    getUserPracticeStreaks: mockGetUserPracticeStreaks,
    listPracticeAttendanceLeaderboard: mockListPracticeAttendanceLeaderboard,
    listUserPracticeAttendanceHistory: mockListUserPracticeAttendanceHistory
  };
});

vi.mock("../src/features/practice/practice-recap.service.js", async () => {
  const actual = await vi.importActual<
    typeof import("../src/features/practice/practice-recap.service.js")
  >("../src/features/practice/practice-recap.service.js");

  return {
    ...actual,
    getLatestPracticeRecap: mockGetLatestPracticeRecap,
    getPracticeRecapForSession: mockGetPracticeRecapForSession
  };
});

vi.mock("../src/features/practice/practice.service.js", async () => {
  const actual = await vi.importActual<
    typeof import("../src/features/practice/practice.service.js")
  >("../src/features/practice/practice.service.js");

  return {
    ...actual,
    endPracticeSession: mockEndPracticeSession
  };
});

vi.mock("../src/features/practice/practice-badge.service.js", async () => {
  const actual = await vi.importActual<
    typeof import("../src/features/practice/practice-badge.service.js")
  >("../src/features/practice/practice-badge.service.js");

  return {
    ...actual,
    backfillPracticeBadges: mockBackfillPracticeBadges,
    listUserPracticeBadges: mockListUserPracticeBadges
  };
});

vi.mock("../src/features/practice/practice-recap-autopost.service.js", () => ({
  autoPostPracticeRecapAfterEnd: mockAutoPostPracticeRecapAfterEnd
}));

vi.mock("../src/lib/prisma.js", () => ({
  prisma: {}
}));

import {
  buildPracticeAttendanceCustomId,
  buildPracticeRsvpCustomId,
  formatPracticeAttendanceMessage,
  formatPracticeRsvpMessage,
  practiceCommand,
  practiceCommandJson
} from "../src/bot/commands/practice.js";

describe("practice command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListUserPracticeAttendanceHistory.mockResolvedValue({
      entries: [],
      summary: {
        attended: 0,
        notHere: 0,
        noResponse: 0,
        totalCompleted: 0
      },
      limit: 10
    });
    mockListPracticeAttendanceLeaderboard.mockResolvedValue({
      entries: [],
      window: {
        period: "current_month",
        label: "May 2026",
        start: new Date("2026-05-01T00:00:00.000Z"),
        end: new Date("2026-06-01T00:00:00.000Z")
      },
      limit: 10
    });
    mockGetUserPracticeStreaks.mockResolvedValue({
      currentStreak: 0,
      longestStreak: 0,
      totalAttended: 0,
      attendedInCurrentMonth: 0,
      lastAttendedAt: null
    });
    mockGetLatestPracticeRecap.mockResolvedValue(null);
    mockGetPracticeRecapForSession.mockResolvedValue(null);
    mockEndPracticeSession.mockResolvedValue(null);
    mockAutoPostPracticeRecapAfterEnd.mockResolvedValue({
      outcome: "posted",
      channelId: "channel_123",
      messageId: "message_123"
    });
    mockListUserPracticeBadges.mockResolvedValue([]);
    mockBackfillPracticeBadges.mockResolvedValue({
      definitionsSynced: 6,
      usersEvaluated: 1,
      awarded: 2,
      alreadyAwarded: 0,
      skipped: 0
    });
  });

  it("exports the expected slash command metadata", () => {
    expect(practiceCommandJson.name).toBe("practice");
    expect(practiceCommandJson.description).toBe(
      "Manage LionDen practice attendance sessions."
    );
    expect(practiceCommandJson.options?.map((option) => option.name)).toEqual([
      "configure",
      "start",
      "end",
      "history",
      "leaderboard",
      "streaks",
      "badges",
      "badge-sync",
      "recap"
    ]);
    expect(practiceCommandJson.default_member_permissions).toBeUndefined();
  });

  it("builds stable RSVP and attendance button custom ids", () => {
    expect(buildPracticeRsvpCustomId("session_123", "GOING")).toBe(
      "practice:rsvp:GOING:session_123"
    );
    expect(buildPracticeAttendanceCustomId("session_123", "HERE")).toBe(
      "practice:attendance:HERE:session_123"
    );
  });

  it("formats the RSVP announcement message", () => {
    expect(
      formatPracticeRsvpMessage({
        startedByDisplayName: "CoachA"
      })
    ).toBe(
      [
        "LionDen practice RSVP is open.",
        "Started by CoachA.",
        "Use these buttons for planning only."
      ].join("\n")
    );
  });

  it("formats the attendance announcement message", () => {
    expect(
      formatPracticeAttendanceMessage({
        startedByDisplayName: "CoachA"
      })
    ).toBe(
      [
        "LionDen practice attendance is open.",
        "Started by CoachA.",
        "Use `I'm Here` or `Not Here` as the official attendance record."
      ].join("\n")
    );
  });

  it("shows practice history for the caller by default", async () => {
    const interaction = createInteraction("history");

    await practiceCommand.execute(interaction as never);

    expect(mockListUserPracticeAttendanceHistory).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        userId: "user_123",
        now: expect.any(Date),
        limit: null
      }
    );
    expect(interaction.reply).toHaveBeenCalledWith({
      content: "Mira has no completed practice attendance history yet.",
      ephemeral: true
    });
  });

  it("shows practice history for a selected member", async () => {
    const target = {
      id: "user_456",
      username: "Kai"
    };
    const interaction = createInteraction("history", {
      targetUser: target,
      limit: 5
    });

    await practiceCommand.execute(interaction as never);

    expect(mockListUserPracticeAttendanceHistory).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        userId: "user_456",
        limit: 5
      })
    );
    expect(interaction.reply).toHaveBeenCalledWith({
      content: "<@user_456> has no completed practice attendance history yet.",
      ephemeral: true
    });
  });

  it("shows the practice leaderboard", async () => {
    const interaction = createInteraction("leaderboard", {
      period: "last_30_days",
      limit: 3
    });

    await practiceCommand.execute(interaction as never);

    expect(mockListPracticeAttendanceLeaderboard).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        now: expect.any(Date),
        period: "last_30_days",
        limit: 3
      }
    );
    expect(interaction.reply).toHaveBeenCalledWith({
      content: "No attended practices are recorded for May 2026.",
      ephemeral: true
    });
  });

  it("shows practice streaks for the caller and selected members", async () => {
    const ownInteraction = createInteraction("streaks");
    const targetInteraction = createInteraction("streaks", {
      targetUser: {
        id: "user_456",
        username: "Kai"
      }
    });

    await practiceCommand.execute(ownInteraction as never);
    await practiceCommand.execute(targetInteraction as never);

    expect(mockGetUserPracticeStreaks).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        userId: "user_123"
      })
    );
    expect(mockGetUserPracticeStreaks).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        userId: "user_456"
      })
    );
    expect(ownInteraction.reply).toHaveBeenCalledWith({
      content: "Mira has no attended practices recorded yet.",
      ephemeral: true
    });
    expect(targetInteraction.reply).toHaveBeenCalledWith({
      content: "<@user_456> has no attended practices recorded yet.",
      ephemeral: true
    });
  });

  it("adds a compact practice badge summary to streaks when available", async () => {
    mockListUserPracticeBadges.mockResolvedValue([
      {
        badge: {
          id: "award_1",
          guildId: "guild_123",
          userId: "user_123",
          badgeKey: "first-practice",
          awardedAt: new Date("2026-05-27T12:00:00.000Z")
        },
        definition: {
          id: "definition_1",
          badgeKey: "first-practice",
          title: "First Practice",
          description: "Attend your first practice.",
          isEnabled: true,
          createdAt: new Date("2026-05-27T12:00:00.000Z"),
          updatedAt: new Date("2026-05-27T12:00:00.000Z")
        }
      }
    ]);
    const interaction = createInteraction("streaks");

    await practiceCommand.execute(interaction as never);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: [
        "Mira has no attended practices recorded yet.",
        "Practice Badges: First Practice"
      ].join("\n"),
      ephemeral: true
    });
  });

  it("shows practice badges for the caller and selected members", async () => {
    const ownInteraction = createInteraction("badges");
    const targetInteraction = createInteraction("badges", {
      targetUser: {
        id: "user_456",
        username: "Kai"
      }
    });

    await practiceCommand.execute(ownInteraction as never);
    await practiceCommand.execute(targetInteraction as never);

    expect(mockListUserPracticeBadges).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        userId: "user_123"
      })
    );
    expect(mockListUserPracticeBadges).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        userId: "user_456"
      })
    );
    expect(ownInteraction.reply).toHaveBeenCalledWith({
      content: "Mira has not earned any practice badges yet.",
      ephemeral: true
    });
    expect(targetInteraction.reply).toHaveBeenCalledWith({
      content: "<@user_456> has not earned any practice badges yet.",
      ephemeral: true
    });
  });

  it("syncs and backfills practice badges for officers", async () => {
    const interaction = createInteraction("badge-sync");

    await practiceCommand.execute(interaction as never);

    expect(mockBackfillPracticeBadges).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        now: expect.any(Date)
      }
    );
    expect(interaction.reply).toHaveBeenCalledWith({
      content: expect.stringContaining("Practice badge sync complete."),
      ephemeral: true
    });
  });

  it("requires Manage Guild for practice badge sync", async () => {
    const interaction = createInteraction("badge-sync", {
      canManageGuild: false
    });

    await practiceCommand.execute(interaction as never);

    expect(mockBackfillPracticeBadges).not.toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalledWith({
      content: "You do not have permission to manage practice sessions.",
      ephemeral: true
    });
  });

  it("posts a practice recap for the latest completed practice", async () => {
    mockGetLatestPracticeRecap.mockResolvedValue(buildRecap());
    const interaction = createInteraction("recap");

    await practiceCommand.execute(interaction as never);

    expect(mockGetLatestPracticeRecap).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        now: expect.any(Date)
      }
    );
    expect(interaction.reply).toHaveBeenCalledWith({
      content: expect.stringContaining("Practice Recap - May 21, 2026")
    });
    expect(mockAutoPostPracticeRecapAfterEnd).not.toHaveBeenCalled();
  });

  it("posts a practice recap for a selected session", async () => {
    mockGetPracticeRecapForSession.mockResolvedValue(buildRecap());
    const interaction = createInteraction("recap", {
      sessionId: "session_456"
    });

    await practiceCommand.execute(interaction as never);

    expect(mockGetPracticeRecapForSession).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        sessionId: "session_456",
        now: expect.any(Date)
      }
    );
  });

  it("handles no completed practice recap privately", async () => {
    const interaction = createInteraction("recap");

    await practiceCommand.execute(interaction as never);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: "No completed practice session is available for a recap yet.",
      ephemeral: true
    });
  });

  it("requires Manage Guild for practice recap", async () => {
    const interaction = createInteraction("recap", {
      canManageGuild: false
    });

    await practiceCommand.execute(interaction as never);

    expect(mockGetLatestPracticeRecap).not.toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalledWith({
      content: "You do not have permission to manage practice sessions.",
      ephemeral: true
    });
  });

  it("auto-posts a practice recap after ending practice", async () => {
    mockEndPracticeSession.mockResolvedValue(buildEndResult());
    const interaction = createInteraction("end");

    await practiceCommand.execute(interaction as never);

    expect(mockEndPracticeSession).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        endedByUserId: "user_123",
        endedAt: expect.any(Date)
      }
    );
    expect(mockAutoPostPracticeRecapAfterEnd).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        guildId: "guild_123",
        practiceId: "session_123",
        session: expect.objectContaining({
          id: "session_123"
        }),
        commandChannel: expect.objectContaining({
          id: "channel_123"
        }),
        client: interaction.client
      })
    );
    expect(interaction.reply).toHaveBeenCalledWith({
      content: expect.stringContaining("Practice recap posted."),
      ephemeral: true
    });
  });

  it("does not auto-post when practice end has no active session", async () => {
    const interaction = createInteraction("end");

    await practiceCommand.execute(interaction as never);

    expect(mockAutoPostPracticeRecapAfterEnd).not.toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalledWith({
      content: "There is no active practice session to end.",
      ephemeral: true
    });
  });

  it("keeps practice end successful when recap auto-post fails", async () => {
    mockEndPracticeSession.mockResolvedValue(buildEndResult());
    mockAutoPostPracticeRecapAfterEnd.mockResolvedValue({
      outcome: "failed",
      error: new Error("cannot post")
    });
    const interaction = createInteraction("end");

    await practiceCommand.execute(interaction as never);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: expect.stringContaining("Recap auto-post could not be sent."),
      ephemeral: true
    });
    expect(interaction.reply).toHaveBeenCalledWith({
      content: expect.stringContaining("Awarded 30 XP to 1 attendee."),
      ephemeral: true
    });
  });
});

const createInteraction = (
  subcommand:
    | "history"
    | "leaderboard"
    | "streaks"
    | "badges"
    | "badge-sync"
    | "recap"
    | "end",
  input: {
    canManageGuild?: boolean;
    sessionId?: string;
    targetUser?: {
      id: string;
      username: string;
    };
    limit?: number;
    period?: string;
  } = {}
) => ({
  guildId: "guild_123",
  user: {
    id: "user_123",
    username: "Mira"
  },
  member: {
    displayName: "Mira"
  },
  memberPermissions: {
    has: vi.fn(() => input.canManageGuild ?? true)
  },
  options: {
    getSubcommand: vi.fn(() => subcommand),
    getUser: vi.fn(() => input.targetUser ?? null),
    getInteger: vi.fn(() => input.limit ?? null),
    getString: vi.fn((name: string) =>
      name === "session_id" ? input.sessionId ?? null : input.period ?? null
    )
  },
  channel: {
    id: "channel_123",
    type: 0,
    isTextBased: vi.fn(() => true),
    send: vi.fn()
  },
  client: {
    channels: {
      fetch: vi.fn(async () => ({
        id: "channel_123",
        isTextBased: () => true
      }))
    }
  },
  reply: vi.fn()
});

const buildRecap = () => ({
  session: {
    id: "session_123",
    guildId: "guild_123",
    startedByUserId: "coach_123",
    startedByDisplayName: "Coach",
    announcementChannelId: "channel_123",
    source: "MANUAL" as const,
    scheduledDateKey: null,
    scheduledStartAt: null,
    scheduledEndAt: null,
    rsvpMessageId: null,
    rsvpPostedAt: null,
    attendanceMessageId: null,
    attendancePostedAt: null,
    status: "ENDED" as const,
    startedAt: new Date("2026-05-20T23:00:00.000Z"),
    endedAt: new Date("2026-05-21T01:00:00.000Z"),
    endedByUserId: "coach_123"
  },
  sessionLabel: "May 21, 2026",
  attendance: {
    attended: 1,
    notHere: 0,
    noResponse: 0,
    trackedResponses: 1
  },
  rewards: {
    rewardedCount: 1,
    xpPerMember: 30,
    totalXpAwarded: 30
  },
  housePoints: [],
  streakHighlights: []
});

const buildEndResult = () => ({
  session: buildRecap().session,
  checkInCount: 1,
  rewardedCount: 1,
  rewardXpPerMember: 30
});

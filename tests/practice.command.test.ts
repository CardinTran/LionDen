import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetLatestPracticeRecap,
  mockGetPracticeRecapForSession,
  mockGetUserPracticeStreaks,
  mockListPracticeAttendanceLeaderboard,
  mockListUserPracticeAttendanceHistory
} = vi.hoisted(() => ({
  mockGetLatestPracticeRecap: vi.fn(),
  mockGetPracticeRecapForSession: vi.fn(),
  mockGetUserPracticeStreaks: vi.fn(),
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
});

const createInteraction = (
  subcommand: "history" | "leaderboard" | "streaks" | "recap",
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

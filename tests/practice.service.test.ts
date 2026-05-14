import { describe, expect, it, vi } from "vitest";

import {
  attachPracticeAttendanceMessage,
  attachPracticeRsvpMessage,
  endPracticeSession,
  getOrCreateScheduledPracticeSession,
  PRACTICE_ATTENDANCE_XP,
  recordPracticeAttendance,
  recordPracticeRsvp,
  startPracticeSession,
  type PracticeCheckInRecord,
  type PracticeSessionRecord
} from "../src/features/practice/practice.service.js";

const buildSession = (
  overrides: Partial<PracticeSessionRecord> = {}
): PracticeSessionRecord => ({
  id: "session_123",
  guildId: "guild_123",
  startedByUserId: "user_123",
  startedByDisplayName: "CoachA",
  announcementChannelId: "channel_123",
  source: "MANUAL",
  scheduledDateKey: null,
  scheduledStartAt: null,
  scheduledEndAt: null,
  rsvpMessageId: null,
  rsvpPostedAt: null,
  attendanceMessageId: null,
  attendancePostedAt: null,
  status: "ACTIVE",
  startedAt: new Date("2026-05-13T00:00:00.000Z"),
  endedAt: null,
  endedByUserId: null,
  ...overrides
});

const buildCheckIn = (
  overrides: Partial<PracticeCheckInRecord> = {}
): PracticeCheckInRecord => ({
  id: "checkin_123",
  sessionId: "session_123",
  guildId: "guild_123",
  userId: "member_123",
  displayName: "MemberA",
  rsvpStatus: null,
  attendanceStatus: null,
  rewardAppliedAt: null,
  rewardXp: 0,
  checkedInAt: new Date("2026-05-13T00:10:00.000Z"),
  updatedAt: new Date("2026-05-13T00:10:00.000Z"),
  ...overrides
});

describe("practice service", () => {
  it("does not start a second active session in the same guild", async () => {
    const activeSession = buildSession();
    const store = {
      practiceSession: {
        findFirst: vi.fn().mockResolvedValue(activeSession),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn(),
        update: vi.fn()
      },
      practiceCheckIn: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        upsert: vi.fn(),
        updateMany: vi.fn(),
        count: vi.fn()
      },
      practiceSchedule: {
        findMany: vi.fn(),
        upsert: vi.fn()
      }
    };

    const result = await startPracticeSession(store, {
      guildId: "guild_123",
      startedByUserId: "user_123",
      startedByDisplayName: "CoachA",
      channelId: "channel_123"
    });

    expect(result).toEqual({
      outcome: "already_active",
      session: activeSession
    });
  });

  it("attaches RSVP and attendance message ids after posting", async () => {
    const rsvpSession = buildSession({
      rsvpMessageId: "message_rsvp_123"
    });
    const updatedSession = buildSession({
      attendanceMessageId: "message_attendance_123"
    });
    const update = vi
      .fn()
      .mockResolvedValueOnce(rsvpSession)
      .mockResolvedValueOnce(updatedSession);

    const rsvpStore: Parameters<typeof attachPracticeRsvpMessage>[0] = {
      practiceSession: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update
      }
    };

    const rsvpResult = await attachPracticeRsvpMessage(
      rsvpStore,
      {
        sessionId: "session_123",
        rsvpMessageId: "message_rsvp_123"
      }
    );

    const attendanceStore: Parameters<typeof attachPracticeAttendanceMessage>[0] = {
      practiceSession: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update
      }
    };

    const attendanceResult = await attachPracticeAttendanceMessage(
      attendanceStore,
      {
        sessionId: "session_123",
        attendanceMessageId: "message_attendance_123",
        activate: false
      }
    );

    expect(update).toHaveBeenCalledWith({
      where: {
        id: "session_123"
      },
      data: {
        rsvpMessageId: "message_rsvp_123",
        rsvpPostedAt: expect.any(Date)
      }
    });
    expect(update).toHaveBeenCalledWith({
      where: {
        id: "session_123"
      },
      data: {
        attendanceMessageId: "message_attendance_123",
        attendancePostedAt: expect.any(Date),
        status: undefined
      }
    });
    expect(rsvpResult.rsvpMessageId).toBe("message_rsvp_123");
    expect(attendanceResult.attendanceMessageId).toBe("message_attendance_123");
  });

  it("stores RSVP separately from actual attendance", async () => {
    let currentCheckIn: PracticeCheckInRecord | null = null;
    const store = {
      practiceSession: {
        findFirst: vi.fn().mockResolvedValue(buildSession()),
        findUnique: vi.fn().mockResolvedValue(buildSession()),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn()
      },
      practiceCheckIn: {
        findUnique: vi.fn(async () => currentCheckIn),
        findMany: vi.fn(),
        upsert: vi.fn(async ({ create, update }) => {
          currentCheckIn = buildCheckIn({
            sessionId: create.sessionId,
            guildId: create.guildId,
            userId: create.userId,
            displayName: update.displayName,
            rsvpStatus:
              update.rsvpStatus ??
              create.rsvpStatus ??
              currentCheckIn?.rsvpStatus ??
              null,
            attendanceStatus:
              update.attendanceStatus ??
              create.attendanceStatus ??
              currentCheckIn?.attendanceStatus ??
              null
          });
          return currentCheckIn;
        }),
        updateMany: vi.fn(),
        count: vi.fn(async ({ where }) =>
          currentCheckIn?.attendanceStatus === where.attendanceStatus ? 1 : 0
        )
      },
      practiceSchedule: {
        findMany: vi.fn(),
        upsert: vi.fn()
      }
    };

    const rsvp = await recordPracticeRsvp(store, {
      sessionId: "session_123",
      guildId: "guild_123",
      userId: "member_123",
      displayName: "MemberA",
      rsvpStatus: "GOING"
    });
    const attendance = await recordPracticeAttendance(store, {
      sessionId: "session_123",
      guildId: "guild_123",
      userId: "member_123",
      displayName: "MemberA",
      attendanceStatus: "HERE"
    });

    expect(rsvp.outcome).toBe("rsvp_recorded");
    expect(rsvp.checkInCount).toBe(0);
    expect(rsvp.participant?.rsvpStatus).toBe("GOING");
    expect(attendance.outcome).toBe("attendance_recorded");
    expect(attendance.checkInCount).toBe(1);
    expect(attendance.participant?.rsvpStatus).toBe("GOING");
    expect(attendance.participant?.attendanceStatus).toBe("HERE");
  });

  it("lets attendance switch between here and not here", async () => {
    let currentCheckIn: PracticeCheckInRecord | null = buildCheckIn({
      attendanceStatus: "HERE"
    });

    const store = {
      practiceSession: {
        findFirst: vi.fn().mockResolvedValue(buildSession()),
        findUnique: vi.fn().mockResolvedValue(buildSession()),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn()
      },
      practiceCheckIn: {
        findUnique: vi.fn(async () => currentCheckIn),
        findMany: vi.fn(),
        upsert: vi.fn(async ({ update }) => {
          currentCheckIn = buildCheckIn({
            ...currentCheckIn!,
            displayName: update.displayName,
            rsvpStatus: update.rsvpStatus ?? currentCheckIn?.rsvpStatus ?? null,
            attendanceStatus:
              update.attendanceStatus ?? currentCheckIn?.attendanceStatus ?? null
          });
          return currentCheckIn;
        }),
        updateMany: vi.fn(),
        count: vi.fn(async ({ where }) =>
          currentCheckIn?.attendanceStatus === where.attendanceStatus ? 1 : 0
        )
      },
      practiceSchedule: {
        findMany: vi.fn(),
        upsert: vi.fn()
      }
    };

    const result = await recordPracticeAttendance(store, {
      sessionId: "session_123",
      guildId: "guild_123",
      userId: "member_123",
      displayName: "MemberA",
      attendanceStatus: "NOT_HERE"
    });

    expect(result.outcome).toBe("attendance_recorded");
    expect(result.checkInCount).toBe(0);
    expect(result.participant?.attendanceStatus).toBe("NOT_HERE");
  });

  it("awards practice xp only to members marked here when ending a session", async () => {
    const hereParticipant = buildCheckIn({
      id: "checkin_here",
      userId: "member_here",
      displayName: "MemberHere",
      attendanceStatus: "HERE"
    });
    const notHereParticipant = buildCheckIn({
      id: "checkin_not_here",
      userId: "member_not_here",
      displayName: "MemberNotHere",
      attendanceStatus: "NOT_HERE"
    });
    const findMany = vi.fn().mockResolvedValue([hereParticipant]);
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const userProfileUpdate = vi.fn(async ({ data }) => ({
      id: "profile_here",
      guildId: "guild_123",
      userId: "member_here",
      displayName: data.displayName,
      xp: data.xp,
      level: data.level,
      coins: data.coins ?? 0,
      lastMessageXpAt: null,
      lastDailyClaimAt: null,
      createdAt: new Date("2026-05-13T00:00:00.000Z"),
      updatedAt: new Date("2026-05-13T00:00:00.000Z")
    }));

    const store = {
      practiceSession: {
        findFirst: vi.fn().mockResolvedValue(buildSession()),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn().mockResolvedValue(
          buildSession({
            status: "ENDED",
            endedAt: new Date("2026-05-13T02:00:00.000Z"),
            endedByUserId: "officer_123"
          })
        )
      },
      practiceCheckIn: {
        findUnique: vi.fn(),
        findMany,
        upsert: vi.fn(),
        updateMany,
        count: vi.fn().mockResolvedValue(1)
      },
      practiceSchedule: {
        findMany: vi.fn(),
        upsert: vi.fn()
      },
      userProfile: {
        upsert: vi.fn(async ({ create, update }) => ({
          id: "profile_here",
          guildId: create.guildId,
          userId: create.userId,
          displayName: update.displayName,
          xp: 90,
          level: 1,
          coins: 0,
          lastMessageXpAt: null,
          lastDailyClaimAt: null,
          createdAt: new Date("2026-05-13T00:00:00.000Z"),
          updatedAt: new Date("2026-05-13T00:00:00.000Z")
        })),
        update: userProfileUpdate
      }
    };

    const result = await endPracticeSession(store, {
      guildId: "guild_123",
      endedByUserId: "officer_123",
      endedAt: new Date("2026-05-13T02:00:00.000Z")
    });

    expect(findMany).toHaveBeenCalledWith({
      where: {
        sessionId: "session_123",
        attendanceStatus: "HERE",
        rewardAppliedAt: null
      }
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: "checkin_here",
        rewardAppliedAt: null
      },
      data: {
        rewardAppliedAt: new Date("2026-05-13T02:00:00.000Z"),
        rewardXp: PRACTICE_ATTENDANCE_XP
      }
    });
    expect(userProfileUpdate).toHaveBeenCalledWith({
      where: {
        guildId_userId: {
          guildId: "guild_123",
          userId: "member_here"
        }
      },
      data: {
        displayName: "MemberHere",
        xp: 120,
        level: 2,
        lastMessageXpAt: null
      }
    });
    expect(result).toMatchObject({
      checkInCount: 1,
      rewardedCount: 1,
      rewardXpPerMember: PRACTICE_ATTENDANCE_XP
    });
    expect(notHereParticipant.attendanceStatus).toBe("NOT_HERE");
  });

  it("does not double-reward a participant if a reward mark is already present", async () => {
    const userProfileUpdate = vi.fn();
    const store = {
      practiceSession: {
        findFirst: vi.fn().mockResolvedValue(buildSession()),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn().mockResolvedValue(
          buildSession({
            status: "ENDED",
            endedAt: new Date("2026-05-13T02:00:00.000Z"),
            endedByUserId: "officer_123"
          })
        )
      },
      practiceCheckIn: {
        findUnique: vi.fn(),
        findMany: vi.fn().mockResolvedValue([
          buildCheckIn({
            id: "checkin_here",
            attendanceStatus: "HERE"
          })
        ]),
        upsert: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        count: vi.fn().mockResolvedValue(1)
      },
      practiceSchedule: {
        findMany: vi.fn(),
        upsert: vi.fn()
      },
      userProfile: {
        upsert: vi.fn(),
        update: userProfileUpdate
      }
    };

    const result = await endPracticeSession(store, {
      guildId: "guild_123",
      endedByUserId: "officer_123",
      endedAt: new Date("2026-05-13T02:00:00.000Z")
    });

    expect(userProfileUpdate).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      rewardedCount: 0,
      rewardXpPerMember: PRACTICE_ATTENDANCE_XP
    });
  });

  it("reuses a scheduled practice session for the same practice date", async () => {
    const existingScheduledSession = buildSession({
      source: "SCHEDULED",
      status: "SCHEDULED",
      scheduledDateKey: "2026-05-18"
    });

    const result = await getOrCreateScheduledPracticeSession(
      {
        practiceSession: {
          findFirst: vi.fn(),
          findUnique: vi.fn().mockResolvedValue(existingScheduledSession),
          create: vi.fn(),
          update: vi.fn()
        }
      },
      {
        guildId: "guild_123",
        channelId: "channel_123",
        startedByUserId: "scheduler",
        startedByDisplayName: "LionDen Scheduler",
        scheduledDateKey: "2026-05-18"
      }
    );

    expect(result).toBe(existingScheduledSession);
  });

  it("ends the active session and returns the attendance count", async () => {
    const activeSession = buildSession();
    const endedSession = buildSession({
      status: "ENDED",
      endedAt: new Date("2026-05-13T02:00:00.000Z"),
      endedByUserId: "coach_123"
    });

    const endStore: Parameters<typeof endPracticeSession>[0] = {
      practiceSession: {
        findFirst: vi.fn().mockResolvedValue(activeSession),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn().mockResolvedValue(endedSession)
      },
      practiceCheckIn: {
        findUnique: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        upsert: vi.fn(),
        updateMany: vi.fn(),
        count: vi.fn().mockResolvedValue(8)
      }
    };

    const result = await endPracticeSession(
      endStore,
      {
        guildId: "guild_123",
        endedByUserId: "coach_123",
        endedAt: new Date("2026-05-13T02:00:00.000Z")
      }
    );

    expect(result?.session.status).toBe("ENDED");
    expect(result?.checkInCount).toBe(8);
  });
});

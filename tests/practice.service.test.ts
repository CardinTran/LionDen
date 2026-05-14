import { describe, expect, it, vi } from "vitest";

import {
  attachPracticeAnnouncementMessage,
  endPracticeSession,
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
  announcementMessageId: null,
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
        create: vi.fn(),
        update: vi.fn()
      },
      practiceCheckIn: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
        count: vi.fn()
      }
    };

    const result = await startPracticeSession(store, {
      guildId: "guild_123",
      startedByUserId: "user_123",
      startedByDisplayName: "CoachA",
      announcementChannelId: "channel_123"
    });

    expect(result).toEqual({
      outcome: "already_active",
      session: activeSession
    });
  });

  it("attaches the announcement message id after posting", async () => {
    const updatedSession = buildSession({
      announcementMessageId: "message_123"
    });
    const update = vi.fn().mockResolvedValue(updatedSession);

    const result = await attachPracticeAnnouncementMessage(
      {
        practiceSession: {
          findFirst: vi.fn(),
          findUnique: vi.fn(),
          create: vi.fn(),
          update
        },
        practiceCheckIn: {
          findUnique: vi.fn(),
          upsert: vi.fn(),
          count: vi.fn()
        }
      },
      {
        sessionId: "session_123",
        announcementMessageId: "message_123"
      }
    );

    expect(update).toHaveBeenCalledWith({
      where: {
        id: "session_123"
      },
      data: {
        announcementMessageId: "message_123"
      }
    });
    expect(result.announcementMessageId).toBe("message_123");
  });

  it("stores RSVP separately from actual attendance", async () => {
    let currentCheckIn: PracticeCheckInRecord | null = null;
    const store = {
      practiceSession: {
        findFirst: vi.fn().mockResolvedValue(buildSession()),
        findUnique: vi.fn().mockResolvedValue(buildSession()),
        create: vi.fn(),
        update: vi.fn()
      },
      practiceCheckIn: {
        findUnique: vi.fn(async () => currentCheckIn),
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
        count: vi.fn(async ({ where }) =>
          currentCheckIn?.attendanceStatus === where.attendanceStatus ? 1 : 0
        )
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
        create: vi.fn(),
        update: vi.fn()
      },
      practiceCheckIn: {
        findUnique: vi.fn(async () => currentCheckIn),
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
        count: vi.fn(async ({ where }) =>
          currentCheckIn?.attendanceStatus === where.attendanceStatus ? 1 : 0
        )
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

  it("ends the active session and returns the attendance count", async () => {
    const activeSession = buildSession();
    const endedSession = buildSession({
      status: "ENDED",
      endedAt: new Date("2026-05-13T02:00:00.000Z"),
      endedByUserId: "coach_123"
    });

    const result = await endPracticeSession(
      {
        practiceSession: {
          findFirst: vi.fn().mockResolvedValue(activeSession),
          findUnique: vi.fn(),
          create: vi.fn(),
          update: vi.fn().mockResolvedValue(endedSession)
        },
        practiceCheckIn: {
          findUnique: vi.fn(),
          upsert: vi.fn(),
          count: vi.fn().mockResolvedValue(8)
        }
      },
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

import { describe, expect, it, vi } from "vitest";

import {
  attachPracticeAnnouncementMessage,
  endPracticeSession,
  recordPracticeCheckIn,
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
  checkedInAt: new Date("2026-05-13T00:10:00.000Z"),
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
        create: vi.fn(),
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
          create: vi.fn(),
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

  it("records a member check-in only once per session", async () => {
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
        create: vi.fn(async ({ data }) => {
          currentCheckIn = buildCheckIn({
            sessionId: data.sessionId,
            guildId: data.guildId,
            userId: data.userId,
            displayName: data.displayName
          });
          return currentCheckIn;
        }),
        count: vi.fn(async () => (currentCheckIn ? 1 : 0))
      }
    };

    const first = await recordPracticeCheckIn(store, {
      sessionId: "session_123",
      guildId: "guild_123",
      userId: "member_123",
      displayName: "MemberA"
    });
    const second = await recordPracticeCheckIn(store, {
      sessionId: "session_123",
      guildId: "guild_123",
      userId: "member_123",
      displayName: "MemberA"
    });

    expect(first.outcome).toBe("checked_in");
    expect(first.checkInCount).toBe(1);
    expect(second.outcome).toBe("already_checked_in");
    expect(second.checkInCount).toBe(1);
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
          create: vi.fn(),
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

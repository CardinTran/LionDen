import { adjustXp } from "../progression/xp-adjustment.service.js";
import type { UserProfileRecord } from "../profiles/profile.service.js";

export type PracticeSessionStatus = "SCHEDULED" | "ACTIVE" | "ENDED";
export type PracticeSessionSource = "MANUAL" | "SCHEDULED";
export type PracticeRsvpStatus =
  | "GOING"
  | "LATE"
  | "LEAVING_EARLY"
  | "NOT_GOING";
export type PracticeAttendanceStatus = "HERE" | "NOT_HERE";

export interface PracticeSessionRecord {
  id: string;
  guildId: string;
  startedByUserId: string;
  startedByDisplayName: string;
  announcementChannelId: string;
  source: PracticeSessionSource;
  scheduledDateKey: string | null;
  scheduledStartAt: Date | null;
  scheduledEndAt: Date | null;
  rsvpMessageId: string | null;
  rsvpPostedAt: Date | null;
  attendanceMessageId: string | null;
  attendancePostedAt: Date | null;
  status: PracticeSessionStatus;
  startedAt: Date;
  endedAt: Date | null;
  endedByUserId: string | null;
}

export interface PracticeCheckInRecord {
  id: string;
  sessionId: string;
  guildId: string;
  userId: string;
  displayName: string;
  rsvpStatus: PracticeRsvpStatus | null;
  attendanceStatus: PracticeAttendanceStatus | null;
  rewardAppliedAt: Date | null;
  rewardXp: number;
  checkedInAt: Date;
  updatedAt: Date;
}

export interface PracticeScheduleRecord {
  id: string;
  guildId: string;
  channelId: string | null;
  timezone: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface PracticeSessionDelegate {
  findFirst(args: unknown): Promise<PracticeSessionRecord | null>;
  findUnique(args: unknown): Promise<PracticeSessionRecord | null>;
  create(args: unknown): Promise<PracticeSessionRecord>;
  update(args: unknown): Promise<PracticeSessionRecord>;
}

interface PracticeCheckInDelegate {
  findUnique(args: unknown): Promise<PracticeCheckInRecord | null>;
  findMany(args: unknown): Promise<PracticeCheckInRecord[]>;
  upsert(args: unknown): Promise<PracticeCheckInRecord>;
  updateMany(args: unknown): Promise<{ count: number }>;
  count(args: unknown): Promise<number>;
}

interface PracticeScheduleDelegate {
  findMany(args: unknown): Promise<PracticeScheduleRecord[]>;
  upsert(args: unknown): Promise<PracticeScheduleRecord>;
}

export interface PracticeStore {
  practiceSession: PracticeSessionDelegate;
  practiceCheckIn: PracticeCheckInDelegate;
  practiceSchedule: PracticeScheduleDelegate;
  userProfile?: {
    upsert(args: {
      where: {
        guildId_userId: {
          guildId: string;
          userId: string;
        };
      };
      create: {
        guildId: string;
        userId: string;
        displayName: string;
      };
      update: {
        displayName: string;
      };
    }): Promise<UserProfileRecord>;
    update(args: {
      where: {
        guildId_userId: {
          guildId: string;
          userId: string;
        };
      };
      data: {
        displayName: string;
        xp?: number;
        level?: number;
        lastMessageXpAt?: Date | null;
      };
    }): Promise<UserProfileRecord>;
  };
}

export interface StartPracticeSessionInput {
  guildId: string;
  startedByUserId: string;
  startedByDisplayName: string;
  channelId: string;
}

export interface RecordPracticeRsvpInput {
  sessionId: string;
  guildId: string;
  userId: string;
  displayName: string;
  rsvpStatus: PracticeRsvpStatus;
}

export interface RecordPracticeAttendanceInput {
  sessionId: string;
  guildId: string;
  userId: string;
  displayName: string;
  attendanceStatus: PracticeAttendanceStatus;
}

export interface EndPracticeSessionInput {
  guildId: string;
  endedByUserId: string;
  endedAt: Date;
}

export interface ScheduledPracticeInput {
  guildId: string;
  channelId: string;
  startedByUserId: string;
  startedByDisplayName: string;
  scheduledDateKey: string;
  scheduledStartAt?: Date;
  scheduledEndAt?: Date;
}

export interface RecordPracticeResponseResult {
  outcome: "rsvp_recorded" | "attendance_recorded" | "session_closed";
  session: PracticeSessionRecord;
  checkInCount: number;
  participant: PracticeCheckInRecord | null;
}

export interface EndPracticeSessionResult {
  session: PracticeSessionRecord;
  checkInCount: number;
  rewardedCount: number;
  rewardXpPerMember: number;
}

export const PRACTICE_ATTENDANCE_XP = 30;

export const getActivePracticeSession = async (
  store: Pick<PracticeStore, "practiceSession">,
  guildId: string
): Promise<PracticeSessionRecord | null> => {
  return store.practiceSession.findFirst({
    where: {
      guildId,
      status: "ACTIVE"
    },
    orderBy: {
      startedAt: "desc"
    }
  });
};

export const getScheduledPracticeSession = async (
  store: Pick<PracticeStore, "practiceSession">,
  input: {
    guildId: string;
    scheduledDateKey: string;
  }
): Promise<PracticeSessionRecord | null> => {
  return store.practiceSession.findUnique({
    where: {
      guildId_source_scheduledDateKey: {
        guildId: input.guildId,
        source: "SCHEDULED",
        scheduledDateKey: input.scheduledDateKey
      }
    }
  });
};

export const startPracticeSession = async (
  store: Pick<PracticeStore, "practiceSession">,
  input: StartPracticeSessionInput
): Promise<
  | { outcome: "started"; session: PracticeSessionRecord }
  | { outcome: "already_active"; session: PracticeSessionRecord }
> => {
  const activeSession = await getActivePracticeSession(store, input.guildId);

  if (activeSession) {
    return {
      outcome: "already_active",
      session: activeSession
    };
  }

  const session = await store.practiceSession.create({
    data: {
      guildId: input.guildId,
      startedByUserId: input.startedByUserId,
      startedByDisplayName: input.startedByDisplayName,
      announcementChannelId: input.channelId,
      source: "MANUAL",
      status: "ACTIVE"
    }
  });

  return {
    outcome: "started",
    session
  };
};

export const getOrCreateScheduledPracticeSession = async (
  store: Pick<PracticeStore, "practiceSession">,
  input: ScheduledPracticeInput
): Promise<PracticeSessionRecord> => {
  const existingSession = await getScheduledPracticeSession(store, {
    guildId: input.guildId,
    scheduledDateKey: input.scheduledDateKey
  });

  if (existingSession) {
    return existingSession;
  }

  return store.practiceSession.create({
    data: {
      guildId: input.guildId,
      startedByUserId: input.startedByUserId,
      startedByDisplayName: input.startedByDisplayName,
      announcementChannelId: input.channelId,
      source: "SCHEDULED",
      scheduledDateKey: input.scheduledDateKey,
      scheduledStartAt: input.scheduledStartAt,
      scheduledEndAt: input.scheduledEndAt,
      status: "SCHEDULED"
    }
  });
};

export const attachPracticeRsvpMessage = async (
  store: Pick<PracticeStore, "practiceSession">,
  input: {
    sessionId: string;
    rsvpMessageId: string;
  }
): Promise<PracticeSessionRecord> => {
  return store.practiceSession.update({
    where: { id: input.sessionId },
    data: {
      rsvpMessageId: input.rsvpMessageId,
      rsvpPostedAt: new Date()
    }
  });
};

export const attachPracticeAttendanceMessage = async (
  store: Pick<PracticeStore, "practiceSession">,
  input: {
    sessionId: string;
    attendanceMessageId: string;
    activate: boolean;
  }
): Promise<PracticeSessionRecord> => {
  return store.practiceSession.update({
    where: { id: input.sessionId },
    data: {
      attendanceMessageId: input.attendanceMessageId,
      attendancePostedAt: new Date(),
      status: input.activate ? "ACTIVE" : undefined
    }
  });
};

const getAttendanceCount = async (
  store: Pick<PracticeStore, "practiceCheckIn">,
  sessionId: string
): Promise<number> => {
  return store.practiceCheckIn.count({
    where: {
      sessionId,
      attendanceStatus: "HERE"
    }
  });
};

const buildClosedSessionPlaceholder = (input: {
  sessionId: string;
  guildId: string;
}): PracticeSessionRecord => ({
  id: input.sessionId,
  guildId: input.guildId,
  startedByUserId: "",
  startedByDisplayName: "",
  announcementChannelId: "",
  source: "MANUAL",
  scheduledDateKey: null,
  scheduledStartAt: null,
  scheduledEndAt: null,
  rsvpMessageId: null,
  rsvpPostedAt: null,
  attendanceMessageId: null,
  attendancePostedAt: null,
  status: "ENDED",
  startedAt: new Date(0),
  endedAt: new Date(0),
  endedByUserId: null
});

const getSessionForRsvp = async (
  store: Pick<PracticeStore, "practiceSession">,
  sessionId: string
): Promise<PracticeSessionRecord | null> => {
  const session = await store.practiceSession.findUnique({
    where: { id: sessionId }
  });

  if (!session || session.status === "ENDED") {
    return null;
  }

  return session;
};

const getSessionForAttendance = async (
  store: Pick<PracticeStore, "practiceSession">,
  sessionId: string
): Promise<PracticeSessionRecord | null> => {
  const session = await store.practiceSession.findUnique({
    where: { id: sessionId }
  });

  if (!session || session.status !== "ACTIVE") {
    return null;
  }

  return session;
};

export const recordPracticeRsvp = async (
  store: Pick<PracticeStore, "practiceSession" | "practiceCheckIn">,
  input: RecordPracticeRsvpInput
): Promise<RecordPracticeResponseResult> => {
  const session = await getSessionForRsvp(store, input.sessionId);

  if (!session) {
    return {
      outcome: "session_closed",
      session: buildClosedSessionPlaceholder(input),
      checkInCount: 0,
      participant: null
    };
  }

  const participant = await store.practiceCheckIn.upsert({
    where: {
      sessionId_userId: {
        sessionId: input.sessionId,
        userId: input.userId
      }
    },
    create: {
      sessionId: input.sessionId,
      guildId: input.guildId,
      userId: input.userId,
      displayName: input.displayName,
      rsvpStatus: input.rsvpStatus
    },
    update: {
      displayName: input.displayName,
      rsvpStatus: input.rsvpStatus
    }
  });

  return {
    outcome: "rsvp_recorded",
    session,
    checkInCount: await getAttendanceCount(store, input.sessionId),
    participant
  };
};

export const recordPracticeAttendance = async (
  store: Pick<PracticeStore, "practiceSession" | "practiceCheckIn">,
  input: RecordPracticeAttendanceInput
): Promise<RecordPracticeResponseResult> => {
  const session = await getSessionForAttendance(store, input.sessionId);

  if (!session) {
    return {
      outcome: "session_closed",
      session: buildClosedSessionPlaceholder(input),
      checkInCount: 0,
      participant: null
    };
  }

  const existingCheckIn = await store.practiceCheckIn.findUnique({
    where: {
      sessionId_userId: {
        sessionId: input.sessionId,
        userId: input.userId
      }
    }
  });

  const participant = await store.practiceCheckIn.upsert({
    where: {
      sessionId_userId: {
        sessionId: input.sessionId,
        userId: input.userId
      }
    },
    create: {
      sessionId: input.sessionId,
      guildId: input.guildId,
      userId: input.userId,
      displayName: input.displayName,
      attendanceStatus: input.attendanceStatus
    },
    update: {
      displayName: input.displayName,
      rsvpStatus: existingCheckIn?.rsvpStatus,
      attendanceStatus: input.attendanceStatus
    }
  });

  return {
    outcome: "attendance_recorded",
    session,
    checkInCount: await getAttendanceCount(store, input.sessionId),
    participant
  };
};

export const endPracticeSession = async (
  store: Pick<
    PracticeStore,
    "practiceSession" | "practiceCheckIn" | "userProfile"
  >,
  input: EndPracticeSessionInput
): Promise<EndPracticeSessionResult | null> => {
  const activeSession = await getActivePracticeSession(store, input.guildId);

  if (!activeSession) {
    return null;
  }

  const session = await store.practiceSession.update({
    where: { id: activeSession.id },
    data: {
      status: "ENDED",
      endedAt: input.endedAt,
      endedByUserId: input.endedByUserId
    }
  });

  let rewardedCount = 0;

  if (store.userProfile) {
    const eligibleParticipants = await store.practiceCheckIn.findMany({
      where: {
        sessionId: session.id,
        attendanceStatus: "HERE",
        rewardAppliedAt: null
      }
    });

    for (const participant of eligibleParticipants) {
      const updateResult = await store.practiceCheckIn.updateMany({
        where: {
          id: participant.id,
          rewardAppliedAt: null
        },
        data: {
          rewardAppliedAt: input.endedAt,
          rewardXp: PRACTICE_ATTENDANCE_XP
        }
      });

      if (updateResult.count === 0) {
        continue;
      }

      await adjustXp(
        {
          userProfile: store.userProfile
        },
        {
          guildId: participant.guildId,
          userId: participant.userId,
          displayName: participant.displayName,
          delta: PRACTICE_ATTENDANCE_XP
        }
      );

      rewardedCount += 1;
    }
  }

  return {
    session,
    checkInCount: await getAttendanceCount(store, session.id),
    rewardedCount,
    rewardXpPerMember: PRACTICE_ATTENDANCE_XP
  };
};

export const upsertPracticeSchedule = async (
  store: Pick<PracticeStore, "practiceSchedule">,
  input: {
    guildId: string;
    channelId?: string | null;
    timezone?: string;
    enabled?: boolean;
  }
): Promise<PracticeScheduleRecord> => {
  return store.practiceSchedule.upsert({
    where: {
      guildId: input.guildId
    },
    create: {
      guildId: input.guildId,
      channelId: input.channelId,
      timezone: input.timezone,
      enabled: input.enabled
    },
    update: {
      channelId: input.channelId,
      timezone: input.timezone,
      enabled: input.enabled
    }
  });
};

export const listEnabledPracticeSchedules = async (
  store: Pick<PracticeStore, "practiceSchedule">
): Promise<PracticeScheduleRecord[]> => {
  return store.practiceSchedule.findMany({
    where: {
      enabled: true
    }
  });
};

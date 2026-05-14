export type PracticeSessionStatus = "ACTIVE" | "ENDED";
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
  announcementMessageId: string | null;
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
  checkedInAt: Date;
  updatedAt: Date;
}

interface PracticeSessionDelegate {
  findFirst(args: {
    where: {
      guildId: string;
      status: PracticeSessionStatus;
    };
    orderBy: {
      startedAt: "asc" | "desc";
    };
  }): Promise<PracticeSessionRecord | null>;
  findUnique(args: {
    where: {
      id: string;
    };
  }): Promise<PracticeSessionRecord | null>;
  create(args: {
    data: {
      guildId: string;
      startedByUserId: string;
      startedByDisplayName: string;
      announcementChannelId: string;
    };
  }): Promise<PracticeSessionRecord>;
  update(args: {
    where: {
      id: string;
    };
    data: {
      announcementMessageId?: string;
      status?: PracticeSessionStatus;
      endedAt?: Date;
      endedByUserId?: string;
    };
  }): Promise<PracticeSessionRecord>;
}

interface PracticeCheckInDelegate {
  findUnique(args: {
    where: {
      sessionId_userId: {
        sessionId: string;
        userId: string;
      };
    };
  }): Promise<PracticeCheckInRecord | null>;
  upsert(args: {
    where: {
      sessionId_userId: {
        sessionId: string;
        userId: string;
      };
    };
    create: {
      sessionId: string;
      guildId: string;
      userId: string;
      displayName: string;
      rsvpStatus?: PracticeRsvpStatus | null;
      attendanceStatus?: PracticeAttendanceStatus | null;
    };
    update: {
      displayName: string;
      rsvpStatus?: PracticeRsvpStatus | null;
      attendanceStatus?: PracticeAttendanceStatus | null;
    };
  }): Promise<PracticeCheckInRecord>;
  count(args: {
    where: {
      sessionId: string;
      attendanceStatus?: PracticeAttendanceStatus;
    };
  }): Promise<number>;
}

interface PracticeStore {
  practiceSession: PracticeSessionDelegate;
  practiceCheckIn: PracticeCheckInDelegate;
}

export interface StartPracticeSessionInput {
  guildId: string;
  startedByUserId: string;
  startedByDisplayName: string;
  announcementChannelId: string;
}

export interface RecordPracticeCheckInInput {
  sessionId: string;
  guildId: string;
  userId: string;
  displayName: string;
}

export interface RecordPracticeRsvpInput extends RecordPracticeCheckInInput {
  rsvpStatus: PracticeRsvpStatus;
}

export interface RecordPracticeAttendanceInput extends RecordPracticeCheckInInput {
  attendanceStatus: PracticeAttendanceStatus;
}

export interface EndPracticeSessionInput {
  guildId: string;
  endedByUserId: string;
  endedAt: Date;
}

export interface RecordPracticeCheckInResult {
  outcome:
    | "rsvp_recorded"
    | "attendance_recorded"
    | "session_closed";
  session: PracticeSessionRecord;
  checkInCount: number;
  participant: PracticeCheckInRecord | null;
}

export interface EndPracticeSessionResult {
  session: PracticeSessionRecord;
  checkInCount: number;
}

export const getActivePracticeSession = async (
  store: PracticeStore,
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

export const startPracticeSession = async (
  store: PracticeStore,
  input: StartPracticeSessionInput
): Promise<
  | {
      outcome: "started";
      session: PracticeSessionRecord;
    }
  | {
      outcome: "already_active";
      session: PracticeSessionRecord;
    }
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
      announcementChannelId: input.announcementChannelId
    }
  });

  return {
    outcome: "started",
    session
  };
};

export const attachPracticeAnnouncementMessage = async (
  store: PracticeStore,
  input: {
    sessionId: string;
    announcementMessageId: string;
  }
): Promise<PracticeSessionRecord> => {
  return store.practiceSession.update({
    where: {
      id: input.sessionId
    },
    data: {
      announcementMessageId: input.announcementMessageId
    }
  });
};

const getAttendanceCount = async (
  store: PracticeStore,
  sessionId: string
): Promise<number> => {
  return store.practiceCheckIn.count({
    where: {
      sessionId,
      attendanceStatus: "HERE"
    }
  });
};

const getSessionOrClosedResult = async (
  store: PracticeStore,
  sessionId: string
): Promise<PracticeSessionRecord | null> => {
  const session = await store.practiceSession.findUnique({
    where: {
      id: sessionId
    }
  });

  if (!session || session.status !== "ACTIVE") {
    return null;
  }

  return session;
};

export const recordPracticeRsvp = async (
  store: PracticeStore,
  input: RecordPracticeRsvpInput
): Promise<RecordPracticeCheckInResult> => {
  const session = await getSessionOrClosedResult(
    store,
    input.sessionId
  );

  if (!session) {
    return {
      outcome: "session_closed",
      session: {
        id: input.sessionId,
        guildId: input.guildId,
        startedByUserId: "",
        startedByDisplayName: "",
        announcementChannelId: "",
        announcementMessageId: null,
        status: "ENDED",
        startedAt: new Date(0),
        endedAt: new Date(0),
        endedByUserId: null
      },
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
  store: PracticeStore,
  input: RecordPracticeAttendanceInput
): Promise<RecordPracticeCheckInResult> => {
  const session = await getSessionOrClosedResult(
    store,
    input.sessionId
  );

  if (!session) {
    return {
      outcome: "session_closed",
      session: {
        id: input.sessionId,
        guildId: input.guildId,
        startedByUserId: "",
        startedByDisplayName: "",
        announcementChannelId: "",
        announcementMessageId: null,
        status: "ENDED",
        startedAt: new Date(0),
        endedAt: new Date(0),
        endedByUserId: null
      },
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
  store: PracticeStore,
  input: EndPracticeSessionInput
): Promise<EndPracticeSessionResult | null> => {
  const activeSession = await getActivePracticeSession(store, input.guildId);

  if (!activeSession) {
    return null;
  }

  const session = await store.practiceSession.update({
    where: {
      id: activeSession.id
    },
    data: {
      status: "ENDED",
      endedAt: input.endedAt,
      endedByUserId: input.endedByUserId
    }
  });

  return {
    session,
    checkInCount: await getAttendanceCount(store, session.id)
  };
};

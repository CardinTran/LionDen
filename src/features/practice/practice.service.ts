export type PracticeSessionStatus = "ACTIVE" | "ENDED";

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
  checkedInAt: Date;
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
  create(args: {
    data: {
      sessionId: string;
      guildId: string;
      userId: string;
      displayName: string;
    };
  }): Promise<PracticeCheckInRecord>;
  count(args: {
    where: {
      sessionId: string;
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

export interface EndPracticeSessionInput {
  guildId: string;
  endedByUserId: string;
  endedAt: Date;
}

export interface RecordPracticeCheckInResult {
  outcome: "checked_in" | "already_checked_in" | "session_closed";
  session: PracticeSessionRecord;
  checkInCount: number;
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

export const recordPracticeCheckIn = async (
  store: PracticeStore,
  input: RecordPracticeCheckInInput
): Promise<RecordPracticeCheckInResult> => {
  const session = await store.practiceSession.findUnique({
    where: {
      id: input.sessionId
    }
  });

  if (!session || session.status !== "ACTIVE") {
    return {
      outcome: "session_closed",
      session:
        session ??
        ({
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
        } satisfies PracticeSessionRecord),
      checkInCount: 0
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

  if (existingCheckIn) {
    return {
      outcome: "already_checked_in",
      session,
      checkInCount: await store.practiceCheckIn.count({
        where: {
          sessionId: input.sessionId
        }
      })
    };
  }

  await store.practiceCheckIn.create({
    data: {
      sessionId: input.sessionId,
      guildId: input.guildId,
      userId: input.userId,
      displayName: input.displayName
    }
  });

  return {
    outcome: "checked_in",
    session,
    checkInCount: await store.practiceCheckIn.count({
      where: {
        sessionId: input.sessionId
      }
    })
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
    checkInCount: await store.practiceCheckIn.count({
      where: {
        sessionId: session.id
      }
    })
  };
};

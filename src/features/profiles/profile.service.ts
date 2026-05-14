export interface UserProfileRecord {
  id: string;
  guildId: string;
  userId: string;
  displayName: string;
  xp: number;
  level: number;
  coins: number;
  lastMessageXpAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface UserProfileFindDelegate {
  findUnique(args: {
    where: {
      guildId_userId: {
        guildId: string;
        userId: string;
      };
    };
  }): Promise<UserProfileRecord | null>;
}

interface UserProfileFindManyDelegate {
  findMany(args: {
    where: {
      guildId: string;
    };
    orderBy: Array<{
      xp?: "asc" | "desc";
      createdAt?: "asc" | "desc";
      updatedAt?: "asc" | "desc";
    }>;
    take: number;
  }): Promise<UserProfileRecord[]>;
}

interface UserProfileUpsertDelegate {
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
}

interface UserProfileUpdateDelegate {
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
      coins?: number;
      lastMessageXpAt?: Date | null;
    };
  }): Promise<UserProfileRecord>;
}

export interface GetOrCreateProfileInput {
  guildId: string;
  userId: string;
  displayName: string;
}

export const getOrCreateProfile = async (
  store: { userProfile: UserProfileUpsertDelegate },
  input: GetOrCreateProfileInput
): Promise<UserProfileRecord> => {
  return store.userProfile.upsert({
    where: {
      guildId_userId: {
        guildId: input.guildId,
        userId: input.userId
      }
    },
    create: {
      guildId: input.guildId,
      userId: input.userId,
      displayName: input.displayName
    },
    update: {
      displayName: input.displayName
    }
  });
};

export const findProfile = async (
  store: { userProfile: UserProfileFindDelegate },
  input: Pick<GetOrCreateProfileInput, "guildId" | "userId">
): Promise<UserProfileRecord | null> => {
  return store.userProfile.findUnique({
    where: {
      guildId_userId: {
        guildId: input.guildId,
        userId: input.userId
      }
    }
  });
};

export const updateProfile = async (
  store: { userProfile: UserProfileUpdateDelegate },
  input: {
    guildId: string;
    userId: string;
    displayName: string;
    xp?: number;
    level?: number;
    coins?: number;
    lastMessageXpAt?: Date | null;
  }
): Promise<UserProfileRecord> => {
  return store.userProfile.update({
    where: {
      guildId_userId: {
        guildId: input.guildId,
        userId: input.userId
      }
    },
    data: {
      displayName: input.displayName,
      xp: input.xp,
      level: input.level,
      coins: input.coins,
      lastMessageXpAt: input.lastMessageXpAt
    }
  });
};

export const listTopProfiles = async (
  store: { userProfile: UserProfileFindManyDelegate },
  input: {
    guildId: string;
    limit: number;
  }
): Promise<UserProfileRecord[]> => {
  return store.userProfile.findMany({
    where: {
      guildId: input.guildId
    },
    orderBy: [{ xp: "desc" }, { updatedAt: "asc" }, { createdAt: "asc" }],
    take: input.limit
  });
};

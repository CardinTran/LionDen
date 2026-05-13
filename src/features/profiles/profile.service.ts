export interface UserProfileRecord {
  id: string;
  guildId: string;
  userId: string;
  displayName: string;
  xp: number;
  level: number;
  createdAt: Date;
  updatedAt: Date;
}

interface UserProfileDelegate {
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

interface ProfileStore {
  userProfile: UserProfileDelegate;
}

export interface GetOrCreateProfileInput {
  guildId: string;
  userId: string;
  displayName: string;
}

export const getOrCreateProfile = async (
  store: ProfileStore,
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

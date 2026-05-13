import { getLevelFromXp } from "./leveling.js";
import {
  getOrCreateProfile,
  updateProfile,
  type UserProfileRecord
} from "../profiles/profile.service.js";

export interface AdjustXpInput {
  guildId: string;
  userId: string;
  displayName: string;
  delta: number;
}

interface XpAdjustmentStore {
  userProfile: {
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

export const adjustXp = async (
  store: XpAdjustmentStore,
  input: AdjustXpInput
): Promise<UserProfileRecord> => {
  const profile = await getOrCreateProfile(store, {
    guildId: input.guildId,
    userId: input.userId,
    displayName: input.displayName
  });

  const nextXp = Math.max(0, profile.xp + input.delta);
  const nextLevel = getLevelFromXp(nextXp);

  return updateProfile(store, {
    guildId: input.guildId,
    userId: input.userId,
    displayName: input.displayName,
    xp: nextXp,
    level: nextLevel,
    lastMessageXpAt: profile.lastMessageXpAt
  });
};

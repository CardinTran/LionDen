import {
  getOrCreateProfile,
  updateProfile,
  type UserProfileRecord
} from "../profiles/profile.service.js";

export interface AdjustCoinsInput {
  guildId: string;
  userId: string;
  displayName: string;
  delta: number;
}

interface CoinBalanceStore {
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
        coins?: number;
        lastMessageXpAt?: Date | null;
        lastDailyClaimAt?: Date | null;
      };
    }): Promise<UserProfileRecord>;
  };
}

export const adjustCoins = async (
  store: CoinBalanceStore,
  input: AdjustCoinsInput
): Promise<UserProfileRecord> => {
  const profile = await getOrCreateProfile(store, {
    guildId: input.guildId,
    userId: input.userId,
    displayName: input.displayName
  });

  const nextCoins = Math.max(0, profile.coins + input.delta);

  return updateProfile(store, {
    guildId: input.guildId,
    userId: input.userId,
    displayName: input.displayName,
    xp: profile.xp,
    level: profile.level,
    coins: nextCoins,
    lastMessageXpAt: profile.lastMessageXpAt,
    lastDailyClaimAt: profile.lastDailyClaimAt
  });
};

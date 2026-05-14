import { getLevelFromXp } from "./leveling.js";
import {
  findProfile,
  getOrCreateProfile,
  updateProfile,
  type UserProfileRecord
} from "../profiles/profile.service.js";

export const MESSAGE_XP_AMOUNT = 5;
export const MESSAGE_XP_COOLDOWN_MS = 10 * 60 * 1000;

export interface AwardMessageXpInput {
  guildId: string;
  userId: string;
  displayName: string;
  awardedAt: Date;
}

export interface AwardMessageXpResult {
  awarded: boolean;
  cooldownEndsAt: Date | null;
  profile: UserProfileRecord;
}

interface MessageXpProfileStore {
  userProfile: {
    findUnique(args: {
      where: {
        guildId_userId: {
          guildId: string;
          userId: string;
        };
      };
    }): Promise<UserProfileRecord | null>;
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
      };
    }): Promise<UserProfileRecord>;
  };
}

const getCooldownEndsAt = (lastAwardedAt: Date): Date => {
  return new Date(lastAwardedAt.getTime() + MESSAGE_XP_COOLDOWN_MS);
};

export const canAwardMessageXp = (
  lastAwardedAt: Date | null,
  now: Date
): { eligible: boolean; cooldownEndsAt: Date | null } => {
  if (!lastAwardedAt) {
    return {
      eligible: true,
      cooldownEndsAt: null
    };
  }

  const cooldownEndsAt = getCooldownEndsAt(lastAwardedAt);

  if (now.getTime() < cooldownEndsAt.getTime()) {
    return {
      eligible: false,
      cooldownEndsAt
    };
  }

  return {
    eligible: true,
    cooldownEndsAt: null
  };
};

export const awardMessageXp = async (
  store: MessageXpProfileStore,
  input: AwardMessageXpInput
): Promise<AwardMessageXpResult> => {
  const existingProfile = await findProfile(store, {
    guildId: input.guildId,
    userId: input.userId
  });

  const eligibility = canAwardMessageXp(
    existingProfile?.lastMessageXpAt ?? null,
    input.awardedAt
  );

  if (!existingProfile) {
    const totalXp = MESSAGE_XP_AMOUNT;
    await getOrCreateProfile(store, {
      guildId: input.guildId,
      userId: input.userId,
      displayName: input.displayName
    });

    const updatedProfile = await updateProfile(store, {
      guildId: input.guildId,
      userId: input.userId,
      displayName: input.displayName,
      xp: totalXp,
      level: getLevelFromXp(totalXp),
      lastMessageXpAt: input.awardedAt
    });

    return {
      awarded: true,
      cooldownEndsAt: null,
      profile: updatedProfile
    };
  }

  if (!eligibility.eligible) {
    if (existingProfile.displayName !== input.displayName) {
      const refreshedProfile = await updateProfile(store, {
        guildId: input.guildId,
        userId: input.userId,
        displayName: input.displayName
      });

      return {
        awarded: false,
        cooldownEndsAt: eligibility.cooldownEndsAt,
        profile: refreshedProfile
      };
    }

    return {
      awarded: false,
      cooldownEndsAt: eligibility.cooldownEndsAt,
      profile: existingProfile
    };
  }

  const totalXp = existingProfile.xp + MESSAGE_XP_AMOUNT;
  const updatedProfile = await updateProfile(store, {
    guildId: input.guildId,
    userId: input.userId,
    displayName: input.displayName,
    xp: totalXp,
    level: getLevelFromXp(totalXp),
    lastMessageXpAt: input.awardedAt
  });

  return {
    awarded: true,
    cooldownEndsAt: null,
    profile: updatedProfile
  };
};

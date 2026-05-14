import {
  getOrCreateProfile,
  updateProfile,
  type UserProfileRecord
} from "../profiles/profile.service.js";

export const DAILY_COIN_REWARD = 25;
export const DAILY_TIMEZONE = "America/Chicago";

export interface ClaimDailyInput {
  guildId: string;
  userId: string;
  displayName: string;
  claimedAt: Date;
}

export interface ClaimDailyResult {
  claimed: boolean;
  profile: UserProfileRecord;
  coinsAwarded: number;
  nextClaimAt: Date;
}

interface DailyClaimStore {
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

const getDateParts = (
  date: Date,
  timeZone: string
): { year: number; month: number; day: number } => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const getPart = (type: "year" | "month" | "day"): number => {
    const value = parts.find((part) => part.type === type)?.value;

    if (!value) {
      throw new Error(`Missing ${type} while formatting date parts.`);
    }

    return Number.parseInt(value, 10);
  };

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day")
  };
};

export const isSameCalendarDay = (
  left: Date,
  right: Date,
  timeZone: string
): boolean => {
  const leftParts = getDateParts(left, timeZone);
  const rightParts = getDateParts(right, timeZone);

  return (
    leftParts.year === rightParts.year &&
    leftParts.month === rightParts.month &&
    leftParts.day === rightParts.day
  );
};

export const getNextDailyClaimAt = (
  lastClaimAt: Date,
  timeZone: string
): Date => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  const parts = formatter.formatToParts(lastClaimAt);
  const valueFor = (type: string): number => {
    const value = parts.find((part) => part.type === type)?.value;

    if (!value) {
      throw new Error(`Missing ${type} while formatting reset date.`);
    }

    return Number.parseInt(value, 10);
  };

  const year = valueFor("year");
  const month = valueFor("month");
  const day = valueFor("day");
  const hour = valueFor("hour");
  const minute = valueFor("minute");
  const second = valueFor("second");

  const utcGuess = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0));
  const offsetDate = new Date(
    Date.UTC(year, month - 1, day, hour, minute, second)
  );
  const offsetMs = offsetDate.getTime() - lastClaimAt.getTime();

  return new Date(utcGuess.getTime() - offsetMs);
};

export const canClaimDaily = (
  lastClaimAt: Date | null,
  now: Date,
  timeZone: string
): { eligible: boolean; nextClaimAt: Date | null } => {
  if (!lastClaimAt) {
    return {
      eligible: true,
      nextClaimAt: null
    };
  }

  if (isSameCalendarDay(lastClaimAt, now, timeZone)) {
    return {
      eligible: false,
      nextClaimAt: getNextDailyClaimAt(lastClaimAt, timeZone)
    };
  }

  return {
    eligible: true,
    nextClaimAt: null
  };
};

export const claimDaily = async (
  store: DailyClaimStore,
  input: ClaimDailyInput
): Promise<ClaimDailyResult> => {
  const profile = await getOrCreateProfile(store, {
    guildId: input.guildId,
    userId: input.userId,
    displayName: input.displayName
  });

  const eligibility = canClaimDaily(
    profile.lastDailyClaimAt,
    input.claimedAt,
    DAILY_TIMEZONE
  );

  if (!eligibility.eligible) {
    const refreshedProfile =
      profile.displayName === input.displayName
        ? profile
        : await updateProfile(store, {
            guildId: input.guildId,
            userId: input.userId,
            displayName: input.displayName
          });

    return {
      claimed: false,
      profile: refreshedProfile,
      coinsAwarded: 0,
      nextClaimAt: eligibility.nextClaimAt ?? input.claimedAt
    };
  }

  const updatedProfile = await updateProfile(store, {
    guildId: input.guildId,
    userId: input.userId,
    displayName: input.displayName,
    xp: profile.xp,
    level: profile.level,
    coins: profile.coins + DAILY_COIN_REWARD,
    lastMessageXpAt: profile.lastMessageXpAt,
    lastDailyClaimAt: input.claimedAt
  });

  return {
    claimed: true,
    profile: updatedProfile,
    coinsAwarded: DAILY_COIN_REWARD,
    nextClaimAt: getNextDailyClaimAt(input.claimedAt, DAILY_TIMEZONE)
  };
};

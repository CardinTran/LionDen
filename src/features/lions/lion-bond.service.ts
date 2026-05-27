import {
  findUserLionFromList,
  listUserLions,
  type UserLionWithSpeciesRecord
} from "./lion-creature.service.js";
import { getFavoriteLion } from "./lion-showcase.service.js";

export const LION_BOND_CARE_XP = 5;
export const LION_BOND_CARE_COOLDOWN_MS = 6 * 60 * 60 * 1000;
export const MAX_LION_BOND_LEVEL = 10;

export type LionBondCareAction = "feed" | "groom";

export interface LionBondProgress {
  level: number;
  bondXp: number;
  currentLevelXp: number;
  nextLevelXp: number | null;
  xpIntoLevel: number;
  xpNeededForNextLevel: number | null;
  xpSpanThisLevel: number | null;
  isMaxLevel: boolean;
}

export interface LionBondStatus {
  lion: UserLionWithSpeciesRecord;
  progress: LionBondProgress;
  mood: string;
  feedCooldownEndsAt: Date | null;
  groomCooldownEndsAt: Date | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface LionBondStore {
  userLion: any;
  favoriteLion: any;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export type LionBondStatusResult =
  | {
      outcome: "status";
      status: LionBondStatus;
      failedQuery: null;
    }
  | {
      outcome: "lion_not_found" | "no_lions" | "no_favorite";
      status: null;
      failedQuery: string | null;
    };

export type LionCareResult =
  | {
      outcome: "cared";
      action: LionBondCareAction;
      status: LionBondStatus;
      gainedBondXp: number;
      previousLevel: number;
      nextLevel: number;
      leveledUp: boolean;
      cooldownEndsAt: null;
      failedQuery: null;
    }
  | {
      outcome: "on_cooldown";
      action: LionBondCareAction;
      status: LionBondStatus;
      gainedBondXp: 0;
      previousLevel: number;
      nextLevel: number;
      leveledUp: false;
      cooldownEndsAt: Date;
      failedQuery: null;
    }
  | {
      outcome: "lion_not_found" | "no_lions" | "no_favorite";
      action: LionBondCareAction;
      status: null;
      gainedBondXp: 0;
      previousLevel: null;
      nextLevel: null;
      leveledUp: false;
      cooldownEndsAt: null;
      failedQuery: string | null;
    };

export const getBondXpForLevel = (level: number): number => {
  const normalizedLevel = Math.min(
    MAX_LION_BOND_LEVEL,
    Math.max(1, Math.floor(level))
  );

  return (25 * (normalizedLevel - 1) * normalizedLevel) / 2;
};

export const getBondLevelForXp = (bondXp: number): number => {
  const normalizedXp = Math.max(0, Math.floor(bondXp));

  for (let level = MAX_LION_BOND_LEVEL; level >= 1; level -= 1) {
    if (normalizedXp >= getBondXpForLevel(level)) {
      return level;
    }
  }

  return 1;
};

export const getBondXpForNextLevel = (level: number): number | null => {
  const normalizedLevel = Math.min(
    MAX_LION_BOND_LEVEL,
    Math.max(1, Math.floor(level))
  );

  if (normalizedLevel >= MAX_LION_BOND_LEVEL) {
    return null;
  }

  return getBondXpForLevel(normalizedLevel + 1);
};

export const getBondProgress = (bondXp: number): LionBondProgress => {
  const normalizedXp = Math.max(0, Math.floor(bondXp));
  const level = getBondLevelForXp(normalizedXp);
  const currentLevelXp = getBondXpForLevel(level);
  const nextLevelXp = getBondXpForNextLevel(level);

  return {
    level,
    bondXp: normalizedXp,
    currentLevelXp,
    nextLevelXp,
    xpIntoLevel: normalizedXp - currentLevelXp,
    xpNeededForNextLevel:
      nextLevelXp === null ? null : Math.max(0, nextLevelXp - normalizedXp),
    xpSpanThisLevel: nextLevelXp === null ? null : nextLevelXp - currentLevelXp,
    isMaxLevel: nextLevelXp === null
  };
};

export const getBondMood = (level: number): string => {
  if (level >= 5) {
    return "Legendary Partner";
  }

  if (level >= 4) {
    return "Loyal";
  }

  if (level >= 3) {
    return "Proud";
  }

  if (level >= 2) {
    return "Comfortable";
  }

  return "Curious";
};

const getCooldownEndsAt = (
  lastActionAt: Date | null | undefined
): Date | null =>
  lastActionAt
    ? new Date(lastActionAt.getTime() + LION_BOND_CARE_COOLDOWN_MS)
    : null;

const isCooldownActive = (cooldownEndsAt: Date | null, now: Date): boolean =>
  cooldownEndsAt !== null && cooldownEndsAt.getTime() > now.getTime();

export const getLionBond = (lion: UserLionWithSpeciesRecord): LionBondStatus => {
  const progress = getBondProgress(lion.bondXp ?? 0);

  return {
    lion,
    progress,
    mood: getBondMood(progress.level),
    feedCooldownEndsAt: getCooldownEndsAt(lion.lastFedAt),
    groomCooldownEndsAt: getCooldownEndsAt(lion.lastGroomedAt)
  };
};

export const getOrCreateLionBond = getLionBond;

export const resolveFavoriteLionForBondAction = async (
  store: Pick<LionBondStore, "favoriteLion">,
  input: {
    guildId: string;
    userId: string;
  }
): Promise<UserLionWithSpeciesRecord | null> => {
  const favorite = await getFavoriteLion(store, input);

  if (
    !favorite ||
    favorite.lion.guildId !== input.guildId ||
    favorite.lion.userId !== input.userId
  ) {
    return null;
  }

  return favorite.lion;
};

export const resolveOwnedLionForBondAction = async (
  store: LionBondStore,
  input: {
    guildId: string;
    userId: string;
    query?: string | null;
  }
): Promise<
  | {
      outcome: "resolved";
      lion: UserLionWithSpeciesRecord;
      failedQuery: null;
    }
  | {
      outcome: "lion_not_found" | "no_lions" | "no_favorite";
      lion: null;
      failedQuery: string | null;
    }
> => {
  const query = input.query?.trim() ?? "";

  if (!query) {
    const favorite = await resolveFavoriteLionForBondAction(store, input);

    return favorite
      ? {
          outcome: "resolved",
          lion: favorite,
          failedQuery: null
        }
      : {
          outcome: "no_favorite",
          lion: null,
          failedQuery: null
        };
  }

  const lions = await listUserLions(store, {
    guildId: input.guildId,
    userId: input.userId,
    limit: 200
  });

  if (lions.length === 0) {
    return {
      outcome: "no_lions",
      lion: null,
      failedQuery: query
    };
  }

  const lion = findUserLionFromList(lions, query);

  return lion
    ? {
        outcome: "resolved",
        lion,
        failedQuery: null
      }
    : {
        outcome: "lion_not_found",
        lion: null,
        failedQuery: query
      };
};

export const getLionBondStatus = async (
  store: LionBondStore,
  input: {
    guildId: string;
    userId: string;
    query?: string | null;
  }
): Promise<LionBondStatusResult> => {
  const resolved = await resolveOwnedLionForBondAction(store, input);

  if (resolved.outcome !== "resolved") {
    return {
      outcome: resolved.outcome,
      status: null,
      failedQuery: resolved.failedQuery
    };
  }

  return {
    outcome: "status",
    status: getLionBond(resolved.lion),
    failedQuery: null
  };
};

const careForLion = async (
  store: LionBondStore,
  input: {
    guildId: string;
    userId: string;
    query?: string | null;
    now: Date;
    action: LionBondCareAction;
  }
): Promise<LionCareResult> => {
  const resolved = await resolveOwnedLionForBondAction(store, input);

  if (resolved.outcome !== "resolved") {
    return {
      outcome: resolved.outcome,
      action: input.action,
      status: null,
      gainedBondXp: 0,
      previousLevel: null,
      nextLevel: null,
      leveledUp: false,
      cooldownEndsAt: null,
      failedQuery: resolved.failedQuery
    };
  }

  const currentStatus = getLionBond(resolved.lion);
  const cooldownEndsAt =
    input.action === "feed"
      ? currentStatus.feedCooldownEndsAt
      : currentStatus.groomCooldownEndsAt;

  if (isCooldownActive(cooldownEndsAt, input.now)) {
    return {
      outcome: "on_cooldown",
      action: input.action,
      status: currentStatus,
      gainedBondXp: 0,
      previousLevel: currentStatus.progress.level,
      nextLevel: currentStatus.progress.level,
      leveledUp: false,
      cooldownEndsAt: cooldownEndsAt as Date,
      failedQuery: null
    };
  }

  const nextBondXp = currentStatus.progress.bondXp + LION_BOND_CARE_XP;
  const nextBondLevel = getBondLevelForXp(nextBondXp);
  const data =
    input.action === "feed"
      ? {
          bondXp: nextBondXp,
          bondLevel: nextBondLevel,
          lastFedAt: input.now
        }
      : {
          bondXp: nextBondXp,
          bondLevel: nextBondLevel,
          lastGroomedAt: input.now
        };

  const lion = await store.userLion.update({
    where: {
      id: resolved.lion.id
    },
    data,
    include: {
      species: true
    }
  });
  const status = getLionBond(lion);

  return {
    outcome: "cared",
    action: input.action,
    status,
    gainedBondXp: LION_BOND_CARE_XP,
    previousLevel: currentStatus.progress.level,
    nextLevel: status.progress.level,
    leveledUp: status.progress.level > currentStatus.progress.level,
    cooldownEndsAt: null,
    failedQuery: null
  };
};

export const feedLion = async (
  store: LionBondStore,
  input: {
    guildId: string;
    userId: string;
    query?: string | null;
    now: Date;
  }
): Promise<LionCareResult> =>
  careForLion(store, {
    ...input,
    action: "feed"
  });

export const groomLion = async (
  store: LionBondStore,
  input: {
    guildId: string;
    userId: string;
    query?: string | null;
    now: Date;
  }
): Promise<LionCareResult> =>
  careForLion(store, {
    ...input,
    action: "groom"
  });

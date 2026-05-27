import {
  findUserLionFromList,
  listUserLionTeam,
  listUserLions,
  type UserLionWithSpeciesRecord
} from "./lion-creature.service.js";

export interface FavoriteLionRecord {
  id: string;
  guildId: string;
  userId: string;
  lionId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FavoriteLionWithLionRecord extends FavoriteLionRecord {
  lion: UserLionWithSpeciesRecord;
}

export interface LionShowcase {
  lion: UserLionWithSpeciesRecord;
  ownerUserId: string;
  ownerDisplayName: string;
  isFavorite: boolean;
  teamSlot: number | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface LionShowcaseStore {
  userLion: any;
  favoriteLion: any;
  userLionTeamSlot: any;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export type SetFavoriteLionResult =
  | {
      outcome: "set";
      favorite: FavoriteLionWithLionRecord;
    }
  | {
      outcome: "lion_not_found" | "no_lions";
      favorite: null;
    };

export type ClearFavoriteLionResult = {
  outcome: "cleared" | "none";
  clearedCount: number;
};

export type ShowcaseOwnedLionResult =
  | {
      outcome: "showcase";
      showcase: LionShowcase;
      failedQuery: null;
    }
  | {
      outcome: "lion_not_found" | "no_lions" | "no_favorite";
      showcase: null;
      failedQuery: string | null;
    };

export const getFavoriteLion = async (
  store: Pick<LionShowcaseStore, "favoriteLion">,
  input: {
    guildId: string;
    userId: string;
  }
): Promise<FavoriteLionWithLionRecord | null> =>
  store.favoriteLion.findUnique({
    where: {
      guildId_userId: {
        guildId: input.guildId,
        userId: input.userId
      }
    },
    include: {
      lion: {
        include: {
          species: true
        }
      }
    }
  });

export const clearFavoriteLion = async (
  store: Pick<LionShowcaseStore, "favoriteLion">,
  input: {
    guildId: string;
    userId: string;
  }
): Promise<ClearFavoriteLionResult> => {
  const result = await store.favoriteLion.deleteMany({
    where: {
      guildId: input.guildId,
      userId: input.userId
    }
  });

  return {
    outcome: result.count > 0 ? "cleared" : "none",
    clearedCount: result.count
  };
};

export const setFavoriteLion = async (
  store: Pick<LionShowcaseStore, "userLion" | "favoriteLion">,
  input: {
    guildId: string;
    userId: string;
    query: string;
  }
): Promise<SetFavoriteLionResult> => {
  const lions = await listUserLions(store, {
    guildId: input.guildId,
    userId: input.userId,
    limit: 200
  });

  if (lions.length === 0) {
    return {
      outcome: "no_lions",
      favorite: null
    };
  }

  const lion = findUserLionFromList(lions, input.query);

  if (!lion) {
    return {
      outcome: "lion_not_found",
      favorite: null
    };
  }

  const favorite = await store.favoriteLion.upsert({
    where: {
      guildId_userId: {
        guildId: input.guildId,
        userId: input.userId
      }
    },
    create: {
      guildId: input.guildId,
      userId: input.userId,
      lionId: lion.id
    },
    update: {
      lionId: lion.id
    },
    include: {
      lion: {
        include: {
          species: true
        }
      }
    }
  });

  return {
    outcome: "set",
    favorite
  };
};

const getTeamSlotForLion = async (
  store: Pick<LionShowcaseStore, "userLionTeamSlot">,
  input: {
    guildId: string;
    userId: string;
    lionId: string;
  }
): Promise<number | null> => {
  const team = await listUserLionTeam(store, {
    guildId: input.guildId,
    userId: input.userId
  });

  return team.find((slot) => slot.userLionId === input.lionId)?.slot ?? null;
};

export const buildLionShowcase = async (
  store: Pick<LionShowcaseStore, "favoriteLion" | "userLionTeamSlot">,
  input: {
    guildId: string;
    userId: string;
    displayName: string;
    lion: UserLionWithSpeciesRecord;
  }
): Promise<LionShowcase> => {
  const [favorite, teamSlot] = await Promise.all([
    getFavoriteLion(store, input),
    getTeamSlotForLion(store, {
      guildId: input.guildId,
      userId: input.userId,
      lionId: input.lion.id
    })
  ]);

  return {
    lion: input.lion,
    ownerUserId: input.userId,
    ownerDisplayName: input.displayName,
    isFavorite: favorite?.lionId === input.lion.id,
    teamSlot
  };
};

export const showcaseOwnedLion = async (
  store: LionShowcaseStore,
  input: {
    guildId: string;
    userId: string;
    displayName: string;
    query?: string | null;
  }
): Promise<ShowcaseOwnedLionResult> => {
  const query = input.query?.trim() ?? "";

  if (!query) {
    const favorite = await getFavoriteLion(store, input);

    if (!favorite) {
      return {
        outcome: "no_favorite",
        showcase: null,
        failedQuery: null
      };
    }

    if (
      favorite.lion.guildId !== input.guildId ||
      favorite.lion.userId !== input.userId
    ) {
      return {
        outcome: "no_favorite",
        showcase: null,
        failedQuery: null
      };
    }

    return {
      outcome: "showcase",
      showcase: await buildLionShowcase(store, {
        ...input,
        lion: favorite.lion
      }),
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
      showcase: null,
      failedQuery: query
    };
  }

  const lion = findUserLionFromList(lions, query);

  if (!lion) {
    return {
      outcome: "lion_not_found",
      showcase: null,
      failedQuery: query
    };
  }

  return {
    outcome: "showcase",
    showcase: await buildLionShowcase(store, {
      ...input,
      lion
    }),
    failedQuery: null
  };
};

export const getFavoriteLionForProfile = getFavoriteLion;

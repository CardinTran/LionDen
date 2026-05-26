import { logger } from "../../lib/logger.js";

export type HousePointSourceTypeValue =
  | "PRACTICE_ATTENDANCE"
  | "WEEKLY_CHALLENGE"
  | "RED_ENVELOPE_CLAIM"
  | "LION_CATCH"
  | "LION_TRAINING"
  | "TRAINING_BATTLE"
  | "DUEL_COMPLETION"
  | "MESSAGE_ACTIVITY"
  | "ADMIN_ADJUSTMENT";

export interface HouseRecord {
  id: string;
  guildId: string;
  houseKey: string;
  name: string;
  description: string | null;
  emoji: string | null;
  color: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface HouseMembershipRecord {
  id: string;
  guildId: string;
  houseId: string;
  userId: string;
  joinedAt: Date;
  updatedAt: Date;
}

export interface HousePointLedgerRecord {
  id: string;
  guildId: string;
  houseId: string;
  userId: string | null;
  sourceType: HousePointSourceTypeValue;
  sourceId: string | null;
  points: number;
  reason: string;
  createdAt: Date;
}

export interface HouseLeaderboardEntry {
  house: HouseRecord;
  points: number;
}

export interface UserHouseProfile {
  membership: HouseMembershipRecord | null;
  house: HouseRecord | null;
  lifetimePoints: number;
  weekPoints: number;
}

export interface HouseStore {
  house: {
    create(args: {
      data: {
        guildId: string;
        houseKey: string;
        name: string;
        description?: string | null;
        emoji?: string | null;
        color?: string | null;
        isActive?: boolean;
      };
    }): Promise<HouseRecord>;
    findUnique(args: {
      where:
        | {
            id: string;
          }
        | {
            guildId_houseKey: {
              guildId: string;
              houseKey: string;
            };
          };
    }): Promise<HouseRecord | null>;
    findMany(args: {
      where: {
        guildId: string;
        isActive?: boolean;
      };
      orderBy?: Array<{
        houseKey?: "asc" | "desc";
        name?: "asc" | "desc";
      }>;
    }): Promise<HouseRecord[]>;
    update(args: {
      where: {
        id: string;
      };
      data: {
        name?: string;
        description?: string | null;
        emoji?: string | null;
        color?: string | null;
        isActive?: boolean;
      };
    }): Promise<HouseRecord>;
    count?(args: {
      where: {
        guildId: string;
        isActive?: boolean;
      };
    }): Promise<number>;
  };
  houseMembership: {
    findUnique(args: {
      where: {
        guildId_userId: {
          guildId: string;
          userId: string;
        };
      };
    }): Promise<HouseMembershipRecord | null>;
    findMany(args: {
      where: {
        guildId: string;
        houseId?: string;
      };
      orderBy?: Array<{
        joinedAt?: "asc" | "desc";
        userId?: "asc" | "desc";
      }>;
    }): Promise<HouseMembershipRecord[]>;
    create(args: {
      data: {
        guildId: string;
        houseId: string;
        userId: string;
      };
    }): Promise<HouseMembershipRecord>;
    update(args: {
      where: {
        guildId_userId: {
          guildId: string;
          userId: string;
        };
      };
      data: {
        houseId: string;
      };
    }): Promise<HouseMembershipRecord>;
    delete(args: {
      where: {
        guildId_userId: {
          guildId: string;
          userId: string;
        };
      };
    }): Promise<HouseMembershipRecord>;
  };
  housePointLedger: {
    create(args: {
      data: {
        guildId: string;
        houseId: string;
        userId?: string | null;
        sourceType: HousePointSourceTypeValue;
        sourceId?: string | null;
        points: number;
        reason: string;
      };
    }): Promise<HousePointLedgerRecord>;
    findUnique(args: {
      where: {
        guildId_sourceType_sourceId: {
          guildId: string;
          sourceType: HousePointSourceTypeValue;
          sourceId: string;
        };
      };
    }): Promise<HousePointLedgerRecord | null>;
    findMany(args: {
      where: {
        guildId: string;
        houseId?: string;
        userId?: string;
        createdAt?: {
          gte?: Date;
        };
      };
      orderBy?: Array<{
        createdAt?: "asc" | "desc";
      }>;
    }): Promise<HousePointLedgerRecord[]>;
  };
}

export type CreateHouseResult =
  | {
      outcome: "created";
      house: HouseRecord;
    }
  | {
      outcome: "duplicate_key";
      house: HouseRecord;
    }
  | {
      outcome: "invalid_key";
      house: null;
    };

export type HouseMembershipResult =
  | {
      outcome: "joined" | "left" | "assigned" | "removed";
      membership: HouseMembershipRecord | null;
      house: HouseRecord | null;
      previousHouse: HouseRecord | null;
    }
  | {
      outcome:
        | "house_not_found"
        | "house_inactive"
        | "already_member"
        | "member_of_other_house"
        | "not_member";
      membership: HouseMembershipRecord | null;
      house: HouseRecord | null;
      previousHouse: HouseRecord | null;
    };

export type UpdateHouseResult =
  | {
      outcome: "updated";
      house: HouseRecord;
    }
  | {
      outcome: "house_not_found";
      house: null;
    };

export type HousePointResult =
  | {
      outcome: "recorded";
      ledger: HousePointLedgerRecord;
      house: HouseRecord;
    }
  | {
      outcome: "duplicate_source";
      ledger: HousePointLedgerRecord;
      house: HouseRecord | null;
    }
  | {
      outcome: "house_not_found" | "not_member" | "house_inactive";
      ledger: null;
      house: HouseRecord | null;
    };

export const normalizeHouseKey = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const getHouseByKey = async (
  store: HouseStore,
  input: {
    guildId: string;
    houseKey: string;
  }
): Promise<HouseRecord | null> => {
  const houseKey = normalizeHouseKey(input.houseKey);

  if (!houseKey) {
    return null;
  }

  return store.house.findUnique({
    where: {
      guildId_houseKey: {
        guildId: input.guildId,
        houseKey
      }
    }
  });
};

export const createHouse = async (
  store: HouseStore,
  input: {
    guildId: string;
    houseKey: string;
    name: string;
    description?: string | null;
    emoji?: string | null;
    color?: string | null;
    createdByUserId?: string;
  }
): Promise<CreateHouseResult> => {
  const houseKey = normalizeHouseKey(input.houseKey);

  if (!houseKey) {
    return {
      outcome: "invalid_key",
      house: null
    };
  }

  const existingHouse = await getHouseByKey(store, {
    guildId: input.guildId,
    houseKey
  });

  if (existingHouse) {
    return {
      outcome: "duplicate_key",
      house: existingHouse
    };
  }

  const house = await store.house.create({
    data: {
      guildId: input.guildId,
      houseKey,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      emoji: input.emoji?.trim() || null,
      color: input.color?.trim() || null,
      isActive: true
    }
  });

  logger.info("House created", {
    guildId: input.guildId,
    houseId: house.id,
    houseKey: house.houseKey,
    adminUserId: input.createdByUserId
  });

  return {
    outcome: "created",
    house
  };
};

export const renameHouse = async (
  store: HouseStore,
  input: {
    guildId: string;
    houseKey: string;
    name?: string | null;
    description?: string | null;
    emoji?: string | null;
    color?: string | null;
  }
): Promise<UpdateHouseResult> => {
  const house = await getHouseByKey(store, input);

  if (!house) {
    return {
      outcome: "house_not_found",
      house: null
    };
  }

  return {
    outcome: "updated",
    house: await store.house.update({
      where: {
        id: house.id
      },
      data: {
        name: input.name?.trim() || undefined,
        description:
          input.description === undefined
            ? undefined
            : input.description?.trim() || null,
        emoji:
          input.emoji === undefined ? undefined : input.emoji?.trim() || null,
        color:
          input.color === undefined ? undefined : input.color?.trim() || null
      }
    })
  };
};

export const deactivateHouse = async (
  store: HouseStore,
  input: {
    guildId: string;
    houseKey: string;
    deactivatedByUserId?: string;
  }
): Promise<UpdateHouseResult> => {
  const house = await getHouseByKey(store, input);

  if (!house) {
    return {
      outcome: "house_not_found",
      house: null
    };
  }

  const updatedHouse = await store.house.update({
    where: {
      id: house.id
    },
    data: {
      isActive: false
    }
  });

  logger.info("House deactivated", {
    guildId: input.guildId,
    houseId: updatedHouse.id,
    houseKey: updatedHouse.houseKey,
    adminUserId: input.deactivatedByUserId
  });

  return {
    outcome: "updated",
    house: updatedHouse
  };
};

export const listActiveHouses = async (
  store: HouseStore,
  guildId: string
): Promise<HouseRecord[]> =>
  store.house.findMany({
    where: {
      guildId,
      isActive: true
    },
    orderBy: [{ houseKey: "asc" }]
  });

export const getUserHouseMembership = async (
  store: HouseStore,
  input: {
    guildId: string;
    userId: string;
  }
): Promise<HouseMembershipRecord | null> =>
  store.houseMembership.findUnique({
    where: {
      guildId_userId: {
        guildId: input.guildId,
        userId: input.userId
      }
    }
  });

const getHouseById = async (
  store: HouseStore,
  houseId: string
): Promise<HouseRecord | null> =>
  store.house.findUnique({
    where: {
      id: houseId
    }
  });

export const joinHouse = async (
  store: HouseStore,
  input: {
    guildId: string;
    userId: string;
    houseKey: string;
  }
): Promise<HouseMembershipResult> => {
  const house = await getHouseByKey(store, input);

  if (!house) {
    return {
      outcome: "house_not_found",
      membership: null,
      house: null,
      previousHouse: null
    };
  }

  if (!house.isActive) {
    return {
      outcome: "house_inactive",
      membership: null,
      house,
      previousHouse: null
    };
  }

  const existingMembership = await getUserHouseMembership(store, input);

  if (existingMembership?.houseId === house.id) {
    return {
      outcome: "already_member",
      membership: existingMembership,
      house,
      previousHouse: house
    };
  }

  if (existingMembership) {
    return {
      outcome: "member_of_other_house",
      membership: existingMembership,
      house,
      previousHouse: await getHouseById(store, existingMembership.houseId)
    };
  }

  const membership = await store.houseMembership.create({
    data: {
      guildId: input.guildId,
      userId: input.userId,
      houseId: house.id
    }
  });

  return {
    outcome: "joined",
    membership,
    house,
    previousHouse: null
  };
};

export const leaveHouse = async (
  store: HouseStore,
  input: {
    guildId: string;
    userId: string;
  }
): Promise<HouseMembershipResult> => {
  const membership = await getUserHouseMembership(store, input);

  if (!membership) {
    return {
      outcome: "not_member",
      membership: null,
      house: null,
      previousHouse: null
    };
  }

  const house = await getHouseById(store, membership.houseId);
  const deletedMembership = await store.houseMembership.delete({
    where: {
      guildId_userId: {
        guildId: input.guildId,
        userId: input.userId
      }
    }
  });

  return {
    outcome: "left",
    membership: deletedMembership,
    house,
    previousHouse: house
  };
};

export const assignUserToHouse = async (
  store: HouseStore,
  input: {
    guildId: string;
    userId: string;
    houseKey: string;
  }
): Promise<HouseMembershipResult> => {
  const house = await getHouseByKey(store, input);

  if (!house) {
    return {
      outcome: "house_not_found",
      membership: null,
      house: null,
      previousHouse: null
    };
  }

  if (!house.isActive) {
    return {
      outcome: "house_inactive",
      membership: null,
      house,
      previousHouse: null
    };
  }

  const existingMembership = await getUserHouseMembership(store, input);
  const previousHouse = existingMembership
    ? await getHouseById(store, existingMembership.houseId)
    : null;

  if (existingMembership?.houseId === house.id) {
    return {
      outcome: "already_member",
      membership: existingMembership,
      house,
      previousHouse
    };
  }

  const membership = existingMembership
    ? await store.houseMembership.update({
        where: {
          guildId_userId: {
            guildId: input.guildId,
            userId: input.userId
          }
        },
        data: {
          houseId: house.id
        }
      })
    : await store.houseMembership.create({
        data: {
          guildId: input.guildId,
          userId: input.userId,
          houseId: house.id
        }
      });

  return {
    outcome: "assigned",
    membership,
    house,
    previousHouse
  };
};

export const removeUserFromHouse = async (
  store: HouseStore,
  input: {
    guildId: string;
    userId: string;
  }
): Promise<HouseMembershipResult> => {
  const membership = await getUserHouseMembership(store, input);

  if (!membership) {
    return {
      outcome: "not_member",
      membership: null,
      house: null,
      previousHouse: null
    };
  }

  const house = await getHouseById(store, membership.houseId);

  await store.houseMembership.delete({
    where: {
      guildId_userId: {
        guildId: input.guildId,
        userId: input.userId
      }
    }
  });

  return {
    outcome: "removed",
    membership,
    house,
    previousHouse: house
  };
};

const getPointTotal = (ledgers: HousePointLedgerRecord[]): number =>
  ledgers.reduce((total, ledger) => total + ledger.points, 0);

const getWeekStartUtc = (date: Date): Date => {
  const utcDate = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() - day + 1);
  return utcDate;
};

export const getHouseProfile = async (
  store: HouseStore,
  input: {
    guildId: string;
    userId: string;
    now: Date;
  }
): Promise<UserHouseProfile> => {
  const membership = await getUserHouseMembership(store, input);

  if (!membership) {
    return {
      membership: null,
      house: null,
      lifetimePoints: 0,
      weekPoints: 0
    };
  }

  const house = await getHouseById(store, membership.houseId);
  const [lifetimeLedger, weekLedger] = await Promise.all([
    store.housePointLedger.findMany({
      where: {
        guildId: input.guildId,
        houseId: membership.houseId
      }
    }),
    store.housePointLedger.findMany({
      where: {
        guildId: input.guildId,
        houseId: membership.houseId,
        createdAt: {
          gte: getWeekStartUtc(input.now)
        }
      }
    })
  ]);

  return {
    membership,
    house,
    lifetimePoints: getPointTotal(lifetimeLedger),
    weekPoints: getPointTotal(weekLedger)
  };
};

export const listHouseRoster = async (
  store: HouseStore,
  input: {
    guildId: string;
    houseKey: string;
  }
): Promise<{
  house: HouseRecord | null;
  memberships: HouseMembershipRecord[];
}> => {
  const house = await getHouseByKey(store, input);

  if (!house) {
    return {
      house: null,
      memberships: []
    };
  }

  return {
    house,
    memberships: await store.houseMembership.findMany({
      where: {
        guildId: input.guildId,
        houseId: house.id
      },
      orderBy: [{ joinedAt: "asc" }]
    })
  };
};

export const addHousePoints = async (
  store: HouseStore,
  input: {
    guildId: string;
    houseId: string;
    userId?: string | null;
    sourceType: HousePointSourceTypeValue;
    sourceId?: string | null;
    points: number;
    reason: string;
    adminUserId?: string;
  }
): Promise<HousePointResult> => {
  const house = await getHouseById(store, input.houseId);

  if (!house) {
    return {
      outcome: "house_not_found",
      ledger: null,
      house: null
    };
  }

  if (input.sourceId) {
    const existingLedger = await store.housePointLedger.findUnique({
      where: {
        guildId_sourceType_sourceId: {
          guildId: input.guildId,
          sourceType: input.sourceType,
          sourceId: input.sourceId
        }
      }
    });

    if (existingLedger) {
      return {
        outcome: "duplicate_source",
        ledger: existingLedger,
        house
      };
    }
  }

  const ledger = await store.housePointLedger.create({
    data: {
      guildId: input.guildId,
      houseId: input.houseId,
      userId: input.userId ?? null,
      sourceType: input.sourceType,
      sourceId: input.sourceId ?? null,
      points: input.points,
      reason: input.reason
    }
  });

  if (input.sourceType === "ADMIN_ADJUSTMENT") {
    logger.info("House points adjusted by admin", {
      guildId: input.guildId,
      houseId: house.id,
      houseKey: house.houseKey,
      userId: input.userId,
      points: input.points,
      adminUserId: input.adminUserId
    });
  }

  return {
    outcome: "recorded",
    ledger,
    house
  };
};

export const removeHousePoints = async (
  store: HouseStore,
  input: {
    guildId: string;
    houseId: string;
    userId?: string | null;
    points: number;
    reason: string;
    adminUserId?: string;
  }
): Promise<HousePointResult> =>
  addHousePoints(store, {
    guildId: input.guildId,
    houseId: input.houseId,
    userId: input.userId ?? null,
    sourceType: "ADMIN_ADJUSTMENT",
    sourceId: null,
    points: -Math.abs(input.points),
    reason: input.reason,
    adminUserId: input.adminUserId
  });

export const recordHousePointsForUser = async (
  store: HouseStore,
  input: {
    guildId: string;
    userId: string;
    sourceType: HousePointSourceTypeValue;
    sourceId?: string | null;
    points: number;
    reason: string;
  }
): Promise<HousePointResult> => {
  const membership = await getUserHouseMembership(store, input);

  if (!membership) {
    return {
      outcome: "not_member",
      ledger: null,
      house: null
    };
  }

  const house = await getHouseById(store, membership.houseId);

  if (!house) {
    return {
      outcome: "house_not_found",
      ledger: null,
      house: null
    };
  }

  if (!house.isActive) {
    return {
      outcome: "house_inactive",
      ledger: null,
      house
    };
  }

  return addHousePoints(store, {
    guildId: input.guildId,
    houseId: membership.houseId,
    userId: input.userId,
    sourceType: input.sourceType,
    sourceId: input.sourceId ?? null,
    points: input.points,
    reason: input.reason
  });
};

export const listHouseLeaderboard = async (
  store: HouseStore,
  input: {
    guildId: string;
    activeOnly?: boolean;
  }
): Promise<HouseLeaderboardEntry[]> => {
  const houses = await store.house.findMany({
    where: {
      guildId: input.guildId,
      isActive: input.activeOnly ?? true
    },
    orderBy: [{ houseKey: "asc" }]
  });
  const entries = await Promise.all(
    houses.map(async (house) => ({
      house,
      points: getPointTotal(
        await store.housePointLedger.findMany({
          where: {
            guildId: input.guildId,
            houseId: house.id
          }
        })
      )
    }))
  );

  return entries.sort((first, second) => {
    const pointsDelta = second.points - first.points;
    return pointsDelta !== 0
      ? pointsDelta
      : first.house.name.localeCompare(second.house.name);
  });
};

export const listUserHousePointSummary = async (
  store: HouseStore,
  input: {
    guildId: string;
    userId: string;
  }
): Promise<number> =>
  getPointTotal(
    await store.housePointLedger.findMany({
      where: {
        guildId: input.guildId,
        userId: input.userId
      }
    })
  );

export const isHousePointStore = (store: unknown): store is HouseStore => {
  const candidate = store as Partial<HouseStore> | null;

  return Boolean(
    candidate?.house && candidate.houseMembership && candidate.housePointLedger
  );
};

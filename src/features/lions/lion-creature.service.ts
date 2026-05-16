import {
  getOrCreateProfile,
  updateProfile,
  type UserProfileRecord
} from "../profiles/profile.service.js";
import {
  DEFAULT_LION_SHOP_ITEMS,
  DEFAULT_LION_SPECIES,
  type LionShopItemSeed,
  type LionSpeciesSeed
} from "./lion-seed-data.js";

export type LionSpawnStatusValue = "ACTIVE" | "CAUGHT" | "EXPIRED";

export interface LionSpeciesRecord extends LionSpeciesSeed {
  id: string;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LionShopItemRecord extends LionShopItemSeed {
  id: string;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserItemInventoryRecord {
  id: string;
  guildId: string;
  userId: string;
  itemKey: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserLionRecord {
  id: string;
  guildId: string;
  userId: string;
  lionSpeciesId: string;
  nickname: string | null;
  level: number;
  experience: number;
  sourceType: string;
  sourceReferenceId: string | null;
  acquiredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserLionWithSpeciesRecord extends UserLionRecord {
  species: LionSpeciesRecord;
}

export interface ActiveLionSpawnRecord {
  id: string;
  guildId: string;
  channelId: string;
  lionSpeciesId: string;
  messageId: string | null;
  status: LionSpawnStatusValue;
  spawnedAt: Date;
  expiresAt: Date;
  caughtByUserId: string | null;
  caughtByDisplayName: string | null;
  caughtAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActiveLionSpawnWithSpeciesRecord extends ActiveLionSpawnRecord {
  species: LionSpeciesRecord;
}

export interface LionSpawnConfigRecord {
  id: string;
  guildId: string;
  enabled: boolean;
  minIntervalMinutes: number;
  maxIntervalMinutes: number;
  nextSpawnAt: Date | null;
  lastSpawnedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
interface LionCreatureStore {
  lionSpecies: any;
  lionShopItemDefinition: any;
  userItemInventory: any;
  activeLionSpawn: any;
  userLion: any;
  lionSpawnConfig: any;
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
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface PurchaseLionShopItemResult {
  outcome: "purchased" | "item_not_found" | "insufficient_coins";
  item: LionShopItemRecord | null;
  inventory: UserItemInventoryRecord | null;
  profile: UserProfileRecord;
}

export interface CreateWildLionSpawnResult {
  outcome: "spawned" | "active_spawn_exists" | "no_species";
  spawn: ActiveLionSpawnWithSpeciesRecord | null;
}

export interface AttemptCatchLionResult {
  outcome:
    | "caught"
    | "missed"
    | "no_spawn"
    | "spawn_expired"
    | "item_not_found"
    | "not_a_ball"
    | "no_item"
    | "already_caught";
  spawn: ActiveLionSpawnWithSpeciesRecord | null;
  item: LionShopItemRecord | null;
  ownedLion: UserLionWithSpeciesRecord | null;
  catchChance: number | null;
}

export const LION_SPAWN_DURATION_MS = 10 * 60 * 1000;
export const DEFAULT_LION_SPAWN_MIN_INTERVAL_MINUTES = 120;
export const DEFAULT_LION_SPAWN_MAX_INTERVAL_MINUTES = 240;

export const normalizeLionItemKey = (rawItemKey: string): string =>
  rawItemKey.trim().toLowerCase().replace(/[\s_]+/g, "-");

export const calculateCatchChance = (input: {
  baseCatchRate: number;
  catchModifier: number;
}): number => Math.min(95, Math.max(5, input.baseCatchRate + input.catchModifier));

export const getRandomIntInclusive = (
  min: number,
  max: number,
  random: () => number
): number => {
  const safeMin = Math.ceil(Math.min(min, max));
  const safeMax = Math.floor(Math.max(min, max));
  return Math.floor(random() * (safeMax - safeMin + 1)) + safeMin;
};

export const chooseWeightedLionSpecies = (
  species: LionSpeciesRecord[],
  random: () => number
): LionSpeciesRecord | null => {
  const enabledSpecies = species.filter((entry) => entry.isEnabled);
  const totalWeight = enabledSpecies.reduce(
    (total, entry) => total + Math.max(0, entry.spawnWeight),
    0
  );

  if (totalWeight <= 0) {
    return null;
  }

  let roll = random() * totalWeight;

  for (const entry of enabledSpecies) {
    roll -= Math.max(0, entry.spawnWeight);

    if (roll <= 0) {
      return entry;
    }
  }

  return enabledSpecies.at(-1) ?? null;
};

export const generateNextLionSpawnAt = (input: {
  config: Pick<LionSpawnConfigRecord, "minIntervalMinutes" | "maxIntervalMinutes">;
  now: Date;
  random: () => number;
}): Date => {
  const intervalMinutes = getRandomIntInclusive(
    input.config.minIntervalMinutes,
    input.config.maxIntervalMinutes,
    input.random
  );

  return new Date(input.now.getTime() + intervalMinutes * 60_000);
};

export const syncDefaultLionData = async (
  store: Pick<LionCreatureStore, "lionSpecies" | "lionShopItemDefinition">
): Promise<void> => {
  await Promise.all(
    DEFAULT_LION_SPECIES.map((species) =>
      store.lionSpecies.upsert({
        where: {
          slug: species.slug
        },
        create: {
          ...species,
          isEnabled: true
        },
        update: {
          ...species,
          isEnabled: true
        }
      })
    )
  );

  await Promise.all(
    DEFAULT_LION_SHOP_ITEMS.map((item) =>
      store.lionShopItemDefinition.upsert({
        where: {
          itemKey: item.itemKey
        },
        create: {
          ...item,
          isEnabled: true
        },
        update: {
          ...item,
          isEnabled: true
        }
      })
    )
  );
};

export const ensureLionSpawnConfig = async (
  store: Pick<LionCreatureStore, "lionSpawnConfig">,
  input: {
    guildId: string;
    now: Date;
    random: () => number;
  }
): Promise<LionSpawnConfigRecord> => {
  const nextSpawnAt = generateNextLionSpawnAt({
    config: {
      minIntervalMinutes: DEFAULT_LION_SPAWN_MIN_INTERVAL_MINUTES,
      maxIntervalMinutes: DEFAULT_LION_SPAWN_MAX_INTERVAL_MINUTES
    },
    now: input.now,
    random: input.random
  });

  return store.lionSpawnConfig.upsert({
    where: {
      guildId: input.guildId
    },
    create: {
      guildId: input.guildId,
      enabled: true,
      minIntervalMinutes: DEFAULT_LION_SPAWN_MIN_INTERVAL_MINUTES,
      maxIntervalMinutes: DEFAULT_LION_SPAWN_MAX_INTERVAL_MINUTES,
      nextSpawnAt
    },
    update: {}
  });
};

export const listEnabledLionSpawnConfigs = async (
  store: Pick<LionCreatureStore, "lionSpawnConfig">
): Promise<LionSpawnConfigRecord[]> => {
  return store.lionSpawnConfig.findMany({
    where: {
      enabled: true
    }
  });
};

export const updateLionSpawnSchedule = async (
  store: Pick<LionCreatureStore, "lionSpawnConfig">,
  input: {
    guildId: string;
    lastSpawnedAt?: Date | null;
    nextSpawnAt: Date;
  }
): Promise<LionSpawnConfigRecord> => {
  return store.lionSpawnConfig.update({
    where: {
      guildId: input.guildId
    },
    data: {
      lastSpawnedAt: input.lastSpawnedAt,
      nextSpawnAt: input.nextSpawnAt
    }
  });
};

export const listLionShopItems = async (
  store: Pick<LionCreatureStore, "lionShopItemDefinition">
): Promise<LionShopItemRecord[]> => {
  return store.lionShopItemDefinition.findMany({
    where: {
      isEnabled: true
    },
    orderBy: [{ priceCoins: "asc" }, { itemKey: "asc" }]
  });
};

export const purchaseLionShopItem = async (
  store: Pick<
    LionCreatureStore,
    "lionShopItemDefinition" | "userItemInventory" | "userProfile"
  >,
  input: {
    guildId: string;
    userId: string;
    displayName: string;
    itemKey: string;
    quantity: number;
  }
): Promise<PurchaseLionShopItemResult> => {
  const itemKey = normalizeLionItemKey(input.itemKey);
  const quantity = Math.max(1, Math.floor(input.quantity));
  const item = await store.lionShopItemDefinition.findUnique({
    where: {
      itemKey
    }
  });
  const profile = await getOrCreateProfile(store, {
    guildId: input.guildId,
    userId: input.userId,
    displayName: input.displayName
  });

  if (!item || !item.isEnabled) {
    return {
      outcome: "item_not_found",
      item: null,
      inventory: null,
      profile
    };
  }

  const totalCost = item.priceCoins * quantity;

  if (profile.coins < totalCost) {
    return {
      outcome: "insufficient_coins",
      item,
      inventory: null,
      profile
    };
  }

  const updatedProfile = await updateProfile(store, {
    guildId: input.guildId,
    userId: input.userId,
    displayName: input.displayName,
    xp: profile.xp,
    level: profile.level,
    coins: profile.coins - totalCost,
    lastMessageXpAt: profile.lastMessageXpAt,
    lastDailyClaimAt: profile.lastDailyClaimAt
  });

  const inventory = await store.userItemInventory.upsert({
    where: {
      guildId_userId_itemKey: {
        guildId: input.guildId,
        userId: input.userId,
        itemKey
      }
    },
    create: {
      guildId: input.guildId,
      userId: input.userId,
      itemKey,
      quantity
    },
    update: {
      quantity: {
        increment: quantity
      }
    }
  });

  return {
    outcome: "purchased",
    item,
    inventory,
    profile: updatedProfile
  };
};

export const listUserItemInventory = async (
  store: Pick<LionCreatureStore, "userItemInventory">,
  input: {
    guildId: string;
    userId: string;
  }
): Promise<UserItemInventoryRecord[]> => {
  return store.userItemInventory.findMany({
    where: {
      guildId: input.guildId,
      userId: input.userId
    },
    orderBy: [{ itemKey: "asc" }]
  });
};

export const expireActiveLionSpawns = async (
  store: Pick<LionCreatureStore, "activeLionSpawn">,
  input: {
    guildId: string;
    now: Date;
  }
): Promise<number> => {
  const result = await store.activeLionSpawn.updateMany({
    where: {
      guildId: input.guildId,
      status: "ACTIVE",
      expiresAt: {
        lte: input.now
      }
    },
    data: {
      status: "EXPIRED"
    }
  });

  return result.count;
};

export const createWildLionSpawn = async (
  store: Pick<LionCreatureStore, "activeLionSpawn" | "lionSpecies">,
  input: {
    guildId: string;
    channelId: string;
    now: Date;
    random: () => number;
  }
): Promise<CreateWildLionSpawnResult> => {
  await expireActiveLionSpawns(store, {
    guildId: input.guildId,
    now: input.now
  });

  const activeSpawn = await store.activeLionSpawn.findFirst({
    where: {
      guildId: input.guildId,
      channelId: input.channelId,
      status: "ACTIVE"
    },
    include: {
      species: true
    }
  });

  if (activeSpawn) {
    return {
      outcome: "active_spawn_exists",
      spawn: activeSpawn
    };
  }

  const species = await store.lionSpecies.findMany({
    where: {
      isEnabled: true
    }
  });
  const selectedSpecies = chooseWeightedLionSpecies(species, input.random);

  if (!selectedSpecies) {
    return {
      outcome: "no_species",
      spawn: null
    };
  }

  const spawn = await store.activeLionSpawn.create({
    data: {
      guildId: input.guildId,
      channelId: input.channelId,
      lionSpeciesId: selectedSpecies.id,
      expiresAt: new Date(input.now.getTime() + LION_SPAWN_DURATION_MS)
    },
    include: {
      species: true
    }
  });

  return {
    outcome: "spawned",
    spawn
  };
};

export const attachWildLionSpawnMessage = async (
  store: Pick<LionCreatureStore, "activeLionSpawn">,
  input: {
    spawnId: string;
    messageId: string;
  }
): Promise<ActiveLionSpawnWithSpeciesRecord> => {
  return store.activeLionSpawn.update({
    where: {
      id: input.spawnId
    },
    data: {
      messageId: input.messageId
    },
    include: {
      species: true
    }
  });
};

export const listActiveWildLionSpawns = async (
  store: Pick<LionCreatureStore, "activeLionSpawn">,
  input: {
    guildId: string;
    now: Date;
  }
): Promise<ActiveLionSpawnWithSpeciesRecord[]> => {
  await expireActiveLionSpawns(store, {
    guildId: input.guildId,
    now: input.now
  });

  return store.activeLionSpawn.findMany({
    where: {
      guildId: input.guildId,
      status: "ACTIVE"
    },
    include: {
      species: true
    },
    orderBy: [{ expiresAt: "asc" }]
  });
};

export const attemptCatchWildLion = async (
  store: Pick<
    LionCreatureStore,
    | "activeLionSpawn"
    | "lionShopItemDefinition"
    | "userItemInventory"
    | "userLion"
  >,
  input: {
    guildId: string;
    channelId: string;
    userId: string;
    displayName: string;
    itemKey: string;
    now: Date;
    random: () => number;
  }
): Promise<AttemptCatchLionResult> => {
  await expireActiveLionSpawns(store, {
    guildId: input.guildId,
    now: input.now
  });

  const spawn = await store.activeLionSpawn.findFirst({
    where: {
      guildId: input.guildId,
      channelId: input.channelId,
      status: "ACTIVE"
    },
    include: {
      species: true
    },
    orderBy: [{ spawnedAt: "asc" }]
  });

  if (!spawn) {
    return {
      outcome: "no_spawn",
      spawn: null,
      item: null,
      ownedLion: null,
      catchChance: null
    };
  }

  if (spawn.expiresAt.getTime() <= input.now.getTime()) {
    await expireActiveLionSpawns(store, {
      guildId: input.guildId,
      now: input.now
    });

    return {
      outcome: "spawn_expired",
      spawn,
      item: null,
      ownedLion: null,
      catchChance: null
    };
  }

  const itemKey = normalizeLionItemKey(input.itemKey);
  const item = await store.lionShopItemDefinition.findUnique({
    where: {
      itemKey
    }
  });

  if (!item || !item.isEnabled) {
    return {
      outcome: "item_not_found",
      spawn,
      item: null,
      ownedLion: null,
      catchChance: null
    };
  }

  if (item.category !== "BALL" || item.effectType !== "CATCH_MODIFIER") {
    return {
      outcome: "not_a_ball",
      spawn,
      item,
      ownedLion: null,
      catchChance: null
    };
  }

  const inventory = await store.userItemInventory.findUnique({
    where: {
      guildId_userId_itemKey: {
        guildId: input.guildId,
        userId: input.userId,
        itemKey
      }
    }
  });

  if (!inventory || inventory.quantity <= 0) {
    return {
      outcome: "no_item",
      spawn,
      item,
      ownedLion: null,
      catchChance: null
    };
  }

  const inventoryUpdate = await store.userItemInventory.updateMany({
    where: {
      guildId: input.guildId,
      userId: input.userId,
      itemKey,
      quantity: {
        gt: 0
      }
    },
    data: {
      quantity: {
        decrement: 1
      }
    }
  });

  if (inventoryUpdate.count === 0) {
    return {
      outcome: "no_item",
      spawn,
      item,
      ownedLion: null,
      catchChance: null
    };
  }

  const catchChance = calculateCatchChance({
    baseCatchRate: spawn.species.baseCatchRate,
    catchModifier: item.effectValue
  });

  if (input.random() >= catchChance / 100) {
    return {
      outcome: "missed",
      spawn,
      item,
      ownedLion: null,
      catchChance
    };
  }

  const catchUpdate = await store.activeLionSpawn.updateMany({
    where: {
      id: spawn.id,
      status: "ACTIVE"
    },
    data: {
      status: "CAUGHT",
      caughtByUserId: input.userId,
      caughtByDisplayName: input.displayName,
      caughtAt: input.now
    }
  });

  if (catchUpdate.count === 0) {
    return {
      outcome: "already_caught",
      spawn,
      item,
      ownedLion: null,
      catchChance
    };
  }

  const ownedLion = await store.userLion.create({
    data: {
      guildId: input.guildId,
      userId: input.userId,
      lionSpeciesId: spawn.lionSpeciesId,
      sourceType: "WILD_CATCH",
      sourceReferenceId: spawn.id,
      acquiredAt: input.now
    },
    include: {
      species: true
    }
  });

  return {
    outcome: "caught",
    spawn,
    item,
    ownedLion,
    catchChance
  };
};

export const listUserLions = async (
  store: Pick<LionCreatureStore, "userLion">,
  input: {
    guildId: string;
    userId: string;
    limit?: number;
  }
): Promise<UserLionWithSpeciesRecord[]> => {
  return store.userLion.findMany({
    where: {
      guildId: input.guildId,
      userId: input.userId
    },
    include: {
      species: true
    },
    orderBy: [{ acquiredAt: "asc" }],
    take: input.limit
  });
};

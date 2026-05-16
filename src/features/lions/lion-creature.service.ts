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
import {
  addLionExperience,
  getLionExperienceProgress
} from "./lion-progression.service.js";

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
  lastTrainedAt: Date | null;
  lastBattledAt: Date | null;
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

export interface LionChannelEffectRecord {
  id: string;
  guildId: string;
  channelId: string;
  itemKey: string;
  effectType:
    | "CATCH_MODIFIER"
    | "SPAWN_BOOST"
    | "RARITY_BOOST"
    | "TYPE_ATTRACTOR";
  effectValue: number;
  activatedByUserId: string;
  activatedAt: Date;
  expiresAt: Date;
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
  lionChannelEffect: any;
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

export interface LionExperienceAwardResult {
  lion: UserLionWithSpeciesRecord;
  gainedExperience: number;
  previousLevel: number;
  nextLevel: number;
  leveledUp: boolean;
}

export interface TrainUserLionResult {
  outcome: "trained" | "lion_not_found" | "on_cooldown";
  result: LionExperienceAwardResult | null;
  cooldownEndsAt: Date | null;
}

export interface AwardBattleLionExperienceResult {
  outcome: "awarded" | "on_cooldown";
  result: LionExperienceAwardResult | null;
  cooldownEndsAt: Date | null;
}

export const LION_SPAWN_DURATION_MS = 10 * 60 * 1000;
export const DEFAULT_LION_SPAWN_MIN_INTERVAL_MINUTES = 120;
export const DEFAULT_LION_SPAWN_MAX_INTERVAL_MINUTES = 240;
export const LION_TRAINING_XP = 35;
export const LION_TRAINING_COOLDOWN_MS = 30 * 60 * 1000;
export const LION_BATTLE_WIN_XP = 45;
export const LION_BATTLE_LOSS_XP = 18;
export const LION_BATTLE_COOLDOWN_MS = 10 * 60 * 1000;

export const normalizeLionItemKey = (rawItemKey: string): string =>
  rawItemKey
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");

export const normalizeLionSearchQuery = (rawQuery: string): string =>
  normalizeLionItemKey(rawQuery).replace(/^#/, "");

export const findUserLionFromList = (
  lions: UserLionWithSpeciesRecord[],
  rawQuery: string
): UserLionWithSpeciesRecord | null => {
  const query = rawQuery.trim().toLowerCase();
  const normalizedQuery = normalizeLionSearchQuery(rawQuery);

  if (!query) {
    return null;
  }

  return (
    lions.find((lion) => lion.id.toLowerCase().startsWith(query)) ??
    lions.find((lion) => lion.species.publicId.toLowerCase() === query) ??
    lions.find((lion) => lion.species.slug === normalizedQuery) ??
    lions.find((lion) => lion.species.name.toLowerCase() === query) ??
    lions.find((lion) => lion.nickname?.toLowerCase() === query) ??
    null
  );
};

export const calculateCatchChance = (input: {
  baseCatchRate: number;
  catchModifier: number;
}): number =>
  Math.min(95, Math.max(5, input.baseCatchRate + input.catchModifier));

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

const getRarityWeightBonus = (
  rarity: LionSpeciesRecord["rarity"],
  effectValue: number
): number => {
  const value = Math.max(0, effectValue);

  switch (rarity) {
    case "LEGENDARY":
      return 1 + value / 10;
    case "EPIC":
      return 1 + value / 20;
    case "RARE":
      return 1 + value / 30;
    case "UNCOMMON":
      return 1 + value / 60;
    default:
      return 1;
  }
};

export const generateNextLionSpawnAt = (input: {
  config: Pick<
    LionSpawnConfigRecord,
    "minIntervalMinutes" | "maxIntervalMinutes"
  >;
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

export const getLionSpawnConfig = async (
  store: Pick<LionCreatureStore, "lionSpawnConfig">,
  guildId: string
): Promise<LionSpawnConfigRecord | null> => {
  return store.lionSpawnConfig.findUnique({
    where: {
      guildId
    }
  });
};

export const configureLionSpawnConfig = async (
  store: Pick<LionCreatureStore, "lionSpawnConfig">,
  input: {
    guildId: string;
    enabled: boolean;
    minIntervalMinutes: number;
    maxIntervalMinutes: number;
    nextSpawnAt: Date;
  }
): Promise<LionSpawnConfigRecord> => {
  return store.lionSpawnConfig.upsert({
    where: {
      guildId: input.guildId
    },
    create: {
      guildId: input.guildId,
      enabled: input.enabled,
      minIntervalMinutes: input.minIntervalMinutes,
      maxIntervalMinutes: input.maxIntervalMinutes,
      nextSpawnAt: input.nextSpawnAt
    },
    update: {
      enabled: input.enabled,
      minIntervalMinutes: input.minIntervalMinutes,
      maxIntervalMinutes: input.maxIntervalMinutes,
      nextSpawnAt: input.nextSpawnAt
    }
  });
};

export const setLionSpawnConfigEnabled = async (
  store: Pick<LionCreatureStore, "lionSpawnConfig">,
  input: {
    guildId: string;
    enabled: boolean;
  }
): Promise<LionSpawnConfigRecord> => {
  return store.lionSpawnConfig.update({
    where: {
      guildId: input.guildId
    },
    data: {
      enabled: input.enabled
    }
  });
};

export const expireActiveLionChannelEffects = async (
  store: Pick<LionCreatureStore, "lionChannelEffect">,
  input: {
    guildId: string;
    now: Date;
  }
): Promise<number> => {
  const result = await store.lionChannelEffect.deleteMany({
    where: {
      guildId: input.guildId,
      expiresAt: {
        lte: input.now
      }
    }
  });

  return result.count;
};

export const getActiveLionChannelEffect = async (
  store: Pick<LionCreatureStore, "lionChannelEffect">,
  input: {
    guildId: string;
    channelId: string;
    now: Date;
  }
): Promise<LionChannelEffectRecord | null> => {
  await expireActiveLionChannelEffects(store, {
    guildId: input.guildId,
    now: input.now
  });

  return store.lionChannelEffect.findFirst({
    where: {
      guildId: input.guildId,
      channelId: input.channelId
    },
    orderBy: [{ expiresAt: "desc" }]
  });
};

export const activateLionChannelEffect = async (
  store: Pick<LionCreatureStore, "lionChannelEffect" | "userItemInventory">,
  input: {
    guildId: string;
    channelId: string;
    userId: string;
    itemKey: string;
    effectType:
      | "CATCH_MODIFIER"
      | "SPAWN_BOOST"
      | "RARITY_BOOST"
      | "TYPE_ATTRACTOR";
    effectValue: number;
    durationMinutes: number;
    now: Date;
  }
): Promise<LionChannelEffectRecord | null> => {
  const itemKey = normalizeLionItemKey(input.itemKey);
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
    return null;
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
    return null;
  }

  const expiresAt = new Date(
    input.now.getTime() + input.durationMinutes * 60_000
  );

  return store.lionChannelEffect.create({
    data: {
      guildId: input.guildId,
      channelId: input.channelId,
      itemKey,
      effectType: input.effectType,
      effectValue: input.effectValue,
      activatedByUserId: input.userId,
      activatedAt: input.now,
      expiresAt
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
  store: Pick<
    LionCreatureStore,
    "activeLionSpawn" | "lionSpecies" | "lionChannelEffect"
  >,
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

  const activeEffect = await store.lionChannelEffect.findFirst({
    where: {
      guildId: input.guildId,
      channelId: input.channelId,
      expiresAt: {
        gt: input.now
      }
    },
    orderBy: [{ expiresAt: "desc" }]
  });

  const weightedSpecies =
    activeEffect?.effectType === "RARITY_BOOST"
      ? species.map((entry: LionSpeciesRecord) => ({
          ...entry,
          spawnWeight: Math.max(
            1,
            Math.floor(
              entry.spawnWeight *
                getRarityWeightBonus(entry.rarity, activeEffect.effectValue)
            )
          )
        }))
      : species;

  const selectedSpecies = chooseWeightedLionSpecies(
    weightedSpecies,
    input.random
  );

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

export const getUserLionByQuery = async (
  store: Pick<LionCreatureStore, "userLion">,
  input: {
    guildId: string;
    userId: string;
    query: string;
    limit?: number;
  }
): Promise<UserLionWithSpeciesRecord | null> => {
  const lions = await listUserLions(store, {
    guildId: input.guildId,
    userId: input.userId,
    limit: input.limit ?? 100
  });

  return findUserLionFromList(lions, input.query);
};

export const awardLionExperience = async (
  store: Pick<LionCreatureStore, "userLion">,
  input: {
    lion: UserLionWithSpeciesRecord;
    gainedExperience: number;
    lastTrainedAt?: Date | null;
    lastBattledAt?: Date | null;
  }
): Promise<LionExperienceAwardResult> => {
  const previousLevel = input.lion.level;
  const progress = addLionExperience({
    currentExperience: input.lion.experience,
    gainedExperience: input.gainedExperience
  });
  const updateData: {
    experience: number;
    level: number;
    lastTrainedAt?: Date | null;
    lastBattledAt?: Date | null;
  } = {
    experience: progress.experience,
    level: progress.level
  };

  if (input.lastTrainedAt !== undefined) {
    updateData.lastTrainedAt = input.lastTrainedAt;
  }

  if (input.lastBattledAt !== undefined) {
    updateData.lastBattledAt = input.lastBattledAt;
  }

  const lion = await store.userLion.update({
    where: {
      id: input.lion.id
    },
    data: updateData,
    include: {
      species: true
    }
  });

  return {
    lion,
    gainedExperience: Math.max(0, Math.floor(input.gainedExperience)),
    previousLevel,
    nextLevel: progress.level,
    leveledUp: progress.level > previousLevel
  };
};

export const trainUserLion = async (
  store: Pick<LionCreatureStore, "userLion">,
  input: {
    guildId: string;
    userId: string;
    query: string;
    now: Date;
  }
): Promise<TrainUserLionResult> => {
  const lion = await getUserLionByQuery(store, input);

  if (!lion) {
    return {
      outcome: "lion_not_found",
      result: null,
      cooldownEndsAt: null
    };
  }

  const cooldownEndsAt = lion.lastTrainedAt
    ? new Date(lion.lastTrainedAt.getTime() + LION_TRAINING_COOLDOWN_MS)
    : null;

  if (cooldownEndsAt && cooldownEndsAt.getTime() > input.now.getTime()) {
    return {
      outcome: "on_cooldown",
      result: null,
      cooldownEndsAt
    };
  }

  const result = await awardLionExperience(store, {
    lion,
    gainedExperience: LION_TRAINING_XP,
    lastTrainedAt: input.now
  });

  return {
    outcome: "trained",
    result,
    cooldownEndsAt: new Date(input.now.getTime() + LION_TRAINING_COOLDOWN_MS)
  };
};

export const awardBattleLionExperience = async (
  store: Pick<LionCreatureStore, "userLion">,
  input: {
    lion: UserLionWithSpeciesRecord;
    gainedExperience: number;
    now: Date;
  }
): Promise<AwardBattleLionExperienceResult> => {
  const cooldownEndsAt = input.lion.lastBattledAt
    ? new Date(input.lion.lastBattledAt.getTime() + LION_BATTLE_COOLDOWN_MS)
    : null;

  if (cooldownEndsAt && cooldownEndsAt.getTime() > input.now.getTime()) {
    return {
      outcome: "on_cooldown",
      result: null,
      cooldownEndsAt
    };
  }

  const result = await awardLionExperience(store, {
    lion: input.lion,
    gainedExperience: input.gainedExperience,
    lastBattledAt: input.now
  });

  return {
    outcome: "awarded",
    result,
    cooldownEndsAt: new Date(input.now.getTime() + LION_BATTLE_COOLDOWN_MS)
  };
};

export const getLionLevelSummary = (
  lion: UserLionWithSpeciesRecord
): string => {
  const progress = getLionExperienceProgress(lion.experience);

  return `Lv. ${lion.level} | ${progress.xpNeededForNextLevel} XP to next`;
};

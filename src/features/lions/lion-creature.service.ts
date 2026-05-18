import {
  getOrCreateProfile,
  updateProfile,
  type UserProfileRecord
} from "../profiles/profile.service.js";
import {
  DEFAULT_LION_SHOP_ITEMS,
  DEFAULT_LION_SPECIES,
  type LionItemEffectTypeValue,
  type LionRarityValue,
  type LionShopItemSeed,
  type LionSpeciesSeed
} from "./lion-seed-data.js";
import {
  addLionExperience,
  deriveLionStats,
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
  ownerDisplayName: string;
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

export interface UserLionTeamSlotRecord {
  id: string;
  guildId: string;
  userId: string;
  slot: number;
  userLionId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserLionTeamSlotWithLionRecord extends UserLionTeamSlotRecord {
  lion: UserLionWithSpeciesRecord;
}

export interface ActiveLionSpawnRecord {
  id: string;
  guildId: string;
  channelId: string;
  lionSpeciesId: string;
  level: number;
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
    | "TYPE_ATTRACTOR"
    | "LEVEL_BOOST"
    | "TRAINING_XP";
  effectValue: number;
  activatedByUserId: string;
  activatedAt: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LionBattleRecord {
  id: string;
  guildId: string;
  challengerUserId: string;
  challengerDisplayName: string;
  opponentUserId: string;
  opponentDisplayName: string;
  winnerUserId: string;
  winnerDisplayName: string;
  loserUserId: string;
  loserDisplayName: string;
  winnerSide: string;
  challengerTeamLionIds: string;
  opponentTeamLionIds: string;
  participantLionIds: string;
  mvpLionId: string | null;
  mvpLionName: string | null;
  roundsCount: number;
  createdAt: Date;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
interface LionCreatureStore {
  lionSpecies: any;
  lionShopItemDefinition: any;
  userItemInventory: any;
  activeLionSpawn: any;
  userLion: any;
  userLionTeamSlot: any;
  lionSpawnConfig: any;
  lionChannelEffect: any;
  lionBattleRecord: any;
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
    findMany?(args: {
      where: {
        guildId: string;
        userId?: {
          in: string[];
        };
      };
    }): Promise<UserProfileRecord[]>;
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface PurchaseLionShopItemResult {
  outcome: "purchased" | "item_not_found" | "insufficient_coins";
  item: LionShopItemRecord | null;
  inventory: UserItemInventoryRecord | null;
  profile: UserProfileRecord;
}

export interface ActivateLionChannelEffectResult {
  outcome: "activated" | "no_item" | "already_active";
  effect: LionChannelEffectRecord | null;
  activeEffect: LionChannelEffectRecord | null;
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

export interface UseLionTrainingItemResult {
  outcome:
    | "used"
    | "lion_not_found"
    | "item_not_found"
    | "not_training_item"
    | "no_item";
  item: LionShopItemRecord | null;
  result: LionExperienceAwardResult | null;
  failedQuery: string | null;
}

export interface AwardBattleLionExperienceResult {
  outcome: "awarded" | "on_cooldown";
  result: LionExperienceAwardResult | null;
  cooldownEndsAt: Date | null;
}

export interface SetUserLionTeamResult {
  outcome:
    | "set"
    | "empty_team"
    | "too_many_lions"
    | "lion_not_found"
    | "duplicate_lion";
  team: UserLionTeamSlotWithLionRecord[];
  failedQuery: string | null;
}

export interface TopLionBoardEntry {
  rank: number;
  lion: UserLionWithSpeciesRecord;
  ownerDisplayName: string;
  score: number;
}

export interface SetUserLionNicknameResult {
  outcome: "updated" | "cleared" | "lion_not_found" | "invalid";
  lion: UserLionWithSpeciesRecord | null;
  normalizedNickname: string | null;
  error: string | null;
}

export interface RecentLionCatchEntry {
  rank: number;
  spawn: ActiveLionSpawnWithSpeciesRecord;
  caughtByDisplayName: string;
}

export interface UserLionBattleCooldownResult {
  allowed: boolean;
  cooldownEndsAt: Date | null;
  latestBattle: LionBattleRecord | null;
}

export interface RecordLionBattleInput {
  guildId: string;
  challengerUserId: string;
  challengerDisplayName: string;
  opponentUserId: string;
  opponentDisplayName: string;
  winnerUserId: string;
  winnerDisplayName: string;
  loserUserId: string;
  loserDisplayName: string;
  winnerSide: "first" | "second";
  challengerTeamLionIds: string[];
  opponentTeamLionIds: string[];
  participantLionIds: string[];
  mvpLionId?: string | null;
  mvpLionName?: string | null;
  roundsCount: number;
  createdAt: Date;
}

export interface AdminLionMutationResult<T> {
  outcome: "updated" | "not_found" | "invalid";
  record: T | null;
  error: string | null;
}

export interface GrantLionItemResult {
  outcome: "granted" | "item_not_found";
  item: LionShopItemRecord | null;
  inventory: UserItemInventoryRecord | null;
}

export const LION_SPAWN_DURATION_MS = 10 * 60 * 1000;
export const DEFAULT_LION_SPAWN_MIN_INTERVAL_MINUTES = 120;
export const DEFAULT_LION_SPAWN_MAX_INTERVAL_MINUTES = 240;
export const LION_TRAINING_XP = 35;
export const LION_TRAINING_COOLDOWN_MS = 30 * 60 * 1000;
export const LION_BATTLE_WIN_XP = 45;
export const LION_BATTLE_LOSS_XP = 18;
export const LION_BATTLE_COOLDOWN_MS = 10 * 60 * 1000;
export const LION_USER_BATTLE_COOLDOWN_MS = 5 * 60 * 1000;
export const MAX_LION_TEAM_SIZE = 3;
export const MAX_LION_NICKNAME_LENGTH = 24;
export const HIGH_LEVEL_WILD_LION_THRESHOLD = 25;
export const WILD_LION_LEVEL_TIERS = [
  {
    maxRollExclusive: 0.75,
    minLevel: 1,
    maxLevel: 10
  },
  {
    maxRollExclusive: 0.95,
    minLevel: 11,
    maxLevel: 25
  },
  {
    maxRollExclusive: 1,
    minLevel: 26,
    maxLevel: 50
  }
] as const;

export const normalizeLionItemKey = (rawItemKey: string): string =>
  rawItemKey
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");

export const normalizeLionSearchQuery = (rawQuery: string): string =>
  normalizeLionItemKey(rawQuery).replace(/^#/, "");

export const getOwnedLionShortReference = (
  lion: Pick<UserLionRecord, "id">
): string => `#${lion.id.slice(0, 8)}`;

export const getOwnedLionDisplayName = (
  lion: Pick<UserLionWithSpeciesRecord, "nickname" | "species">
): string =>
  lion.nickname?.trim()
    ? `${lion.nickname.trim()} (${lion.species.name})`
    : lion.species.name;

export const validateLionNickname = (
  rawNickname: string
): {
  nickname: string | null;
  error: string | null;
} => {
  const nickname = rawNickname.trim().replace(/\s+/g, " ");

  if (!nickname) {
    return {
      nickname: null,
      error: null
    };
  }

  if (nickname.length > MAX_LION_NICKNAME_LENGTH) {
    return {
      nickname: null,
      error: `Nicknames can be at most ${MAX_LION_NICKNAME_LENGTH} characters.`
    };
  }

  if (/[`@#\n\r]/.test(nickname)) {
    return {
      nickname: null,
      error: "Nicknames cannot include mentions, tags, backticks, or line breaks."
    };
  }

  return {
    nickname,
    error: null
  };
};

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
  level?: number;
}): number =>
  Math.min(
    95,
    Math.max(
      5,
      input.baseCatchRate +
        input.catchModifier -
        getLionSpawnLevelCatchPenalty(input.level ?? 1)
    )
  );

export const getLionSpawnLevelCatchPenalty = (level: number): number =>
  Math.min(8, Math.floor(Math.max(0, level - 1) / 10));

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

export const generateWildLionSpawnLevel = (input: {
  random: () => number;
  levelBonus?: number;
  minLevel?: number;
  maxLevel?: number;
}): number => {
  const tierRoll = input.random();
  const tier =
    WILD_LION_LEVEL_TIERS.find((entry) => tierRoll < entry.maxRollExclusive) ??
    WILD_LION_LEVEL_TIERS[0];
  const minLevel = input.minLevel ?? tier.minLevel;
  const maxLevel = input.maxLevel ?? tier.maxLevel;
  const baseLevel = getRandomIntInclusive(minLevel, maxLevel, input.random);
  const levelBonus = Math.max(0, Math.floor(input.levelBonus ?? 0));

  return Math.min(50, Math.max(1, baseLevel + levelBonus));
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
    DEFAULT_LION_SPECIES.map((species) => {
      const syncedSpeciesFields = {
        publicId: species.publicId,
        name: species.name,
        imagePath: species.imagePath,
        rarity: species.rarity,
        baseValue: species.baseValue,
        primaryType: species.primaryType,
        secondaryType: species.secondaryType,
        baseHp: species.baseHp,
        baseAttack: species.baseAttack,
        baseDefense: species.baseDefense,
        baseSpeed: species.baseSpeed,
        abilityKey: species.abilityKey,
        abilityName: species.abilityName,
        abilityDescription: species.abilityDescription,
        description: species.description
      };

      return store.lionSpecies.upsert({
        where: {
          slug: species.slug
        },
        create: {
          ...species,
          isEnabled: true
        },
        update: {
          ...syncedSpeciesFields
        }
      });
    })
  );

  await Promise.all(
    DEFAULT_LION_SHOP_ITEMS.map((item) => {
      const syncedItemFields = {
        name: item.name,
        category: item.category,
        effectType: item.effectType,
        description: item.description
      };

      return store.lionShopItemDefinition.upsert({
        where: {
          itemKey: item.itemKey
        },
        create: {
          ...item,
          isEnabled: true
        },
        update: {
          ...syncedItemFields
        }
      });
    })
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
      channelId: input.channelId,
      expiresAt: {
        gt: input.now
      }
    },
    orderBy: [{ expiresAt: "desc" }]
  });
};

export const listActiveLionChannelEffects = async (
  store: Pick<LionCreatureStore, "lionChannelEffect">,
  input: {
    guildId: string;
    channelId?: string;
    effectType?: LionItemEffectTypeValue;
    now: Date;
  }
): Promise<LionChannelEffectRecord[]> => {
  await expireActiveLionChannelEffects(store, {
    guildId: input.guildId,
    now: input.now
  });

  return store.lionChannelEffect.findMany({
    where: {
      guildId: input.guildId,
      channelId: input.channelId,
      effectType: input.effectType,
      expiresAt: {
        gt: input.now
      }
    },
    orderBy: [{ expiresAt: "desc" }, { activatedAt: "asc" }]
  });
};

export const activateLionChannelEffect = async (
  store: Pick<LionCreatureStore, "lionChannelEffect" | "userItemInventory">,
  input: {
    guildId: string;
    channelId: string;
    userId: string;
    itemKey: string;
    effectType: LionItemEffectTypeValue;
    effectValue: number;
    durationMinutes: number;
    now: Date;
  }
): Promise<ActivateLionChannelEffectResult> => {
  const itemKey = normalizeLionItemKey(input.itemKey);
  const activeEffect = await store.lionChannelEffect.findFirst({
    where: {
      guildId: input.guildId,
      channelId: input.channelId,
      effectType: input.effectType,
      expiresAt: {
        gt: input.now
      }
    },
    orderBy: [{ expiresAt: "desc" }]
  });

  if (activeEffect) {
    return {
      outcome: "already_active",
      effect: null,
      activeEffect
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
      effect: null,
      activeEffect: null
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
      effect: null,
      activeEffect: null
    };
  }

  const expiresAt = new Date(
    input.now.getTime() + input.durationMinutes * 60_000
  );

  const effect = await store.lionChannelEffect.create({
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

  return {
    outcome: "activated",
    effect,
    activeEffect: null
  };
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
    speciesPublicId?: string | null;
    rarity?: LionRarityValue | null;
    minLevel?: number | null;
    maxLevel?: number | null;
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
      isEnabled: true,
      publicId: input.speciesPublicId?.trim().toUpperCase() || undefined,
      rarity: input.rarity || undefined
    }
  });

  const activeEffects: LionChannelEffectRecord[] =
    await store.lionChannelEffect.findMany({
      where: {
        guildId: input.guildId,
        channelId: input.channelId,
        expiresAt: {
          gt: input.now
        }
      },
      orderBy: [{ expiresAt: "desc" }]
    });
  const rarityBoost = activeEffects.find(
    (effect) => effect.effectType === "RARITY_BOOST"
  );
  const levelBoost = activeEffects.find(
    (effect) => effect.effectType === "LEVEL_BOOST"
  );

  const weightedSpecies =
    rarityBoost
      ? species.map((entry: LionSpeciesRecord) => ({
          ...entry,
          spawnWeight: Math.max(
            1,
            Math.floor(
              entry.spawnWeight *
                getRarityWeightBonus(entry.rarity, rarityBoost.effectValue)
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
      level: generateWildLionSpawnLevel({
        random: input.random,
        levelBonus: levelBoost?.effectValue,
        minLevel: input.minLevel ?? undefined,
        maxLevel: input.maxLevel ?? undefined
      }),
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

export const listRecentNotableLionCatches = async (
  store: Pick<LionCreatureStore, "activeLionSpawn">,
  input: {
    guildId: string;
    limit?: number;
  }
): Promise<RecentLionCatchEntry[]> => {
  const limit = Math.min(15, Math.max(1, input.limit ?? 10));
  const spawns: ActiveLionSpawnWithSpeciesRecord[] =
    await store.activeLionSpawn.findMany({
      where: {
        guildId: input.guildId,
        status: "CAUGHT",
        caughtAt: {
          not: null
        },
        OR: [
          {
            level: {
              gte: HIGH_LEVEL_WILD_LION_THRESHOLD
            }
          },
          {
            species: {
              is: {
                rarity: {
                  in: ["RARE", "EPIC", "LEGENDARY"]
                }
              }
            }
          }
        ]
      },
      include: {
        species: true
      },
      orderBy: [{ caughtAt: "desc" }, { spawnedAt: "desc" }],
      take: limit
    });

  return spawns.map((spawn, index) => ({
    rank: index + 1,
    spawn,
    caughtByDisplayName: spawn.caughtByDisplayName ?? "Unknown member"
  }));
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
    catchModifier: item.effectValue,
    level: spawn.level
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
      ownerDisplayName: input.displayName,
      lionSpeciesId: spawn.lionSpeciesId,
      level: spawn.level,
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

export const setUserLionNickname = async (
  store: Pick<LionCreatureStore, "userLion">,
  input: {
    guildId: string;
    userId: string;
    query: string;
    nickname: string;
  }
): Promise<SetUserLionNicknameResult> => {
  const lion = await getUserLionByQuery(store, input);

  if (!lion) {
    return {
      outcome: "lion_not_found",
      lion: null,
      normalizedNickname: null,
      error: null
    };
  }

  const validation = validateLionNickname(input.nickname);

  if (validation.error) {
    return {
      outcome: "invalid",
      lion: null,
      normalizedNickname: null,
      error: validation.error
    };
  }

  const updatedLion = await store.userLion.update({
    where: {
      id: lion.id
    },
    data: {
      nickname: validation.nickname
    },
    include: {
      species: true
    }
  });

  return {
    outcome: validation.nickname ? "updated" : "cleared",
    lion: updatedLion,
    normalizedNickname: validation.nickname,
    error: null
  };
};

export const calculateTopLionScore = (
  lion: UserLionWithSpeciesRecord
): number => {
  const stats = deriveLionStats(lion.species, lion.level);

  return (
    lion.level * 1_000 +
    Math.floor(lion.experience / 10) +
    stats.hp +
    stats.attack * 3 +
    stats.defense * 2 +
    stats.speed * 2
  );
};

const getStoredOwnerDisplayName = (
  lion: Pick<UserLionRecord, "ownerDisplayName" | "userId">,
  profileByUserId: Map<string, UserProfileRecord>
): string => {
  const storedName = lion.ownerDisplayName.trim();

  if (storedName) {
    return storedName;
  }

  return profileByUserId.get(lion.userId)?.displayName ?? "Unknown member";
};

export const listTopOwnedLions = async (
  store: Pick<LionCreatureStore, "userLion" | "userProfile">,
  input: {
    guildId: string;
    limit?: number;
  }
): Promise<TopLionBoardEntry[]> => {
  const limit = Math.min(25, Math.max(1, input.limit ?? 10));
  const candidates: UserLionWithSpeciesRecord[] = await store.userLion.findMany(
    {
      where: {
        guildId: input.guildId
      },
      include: {
        species: true
      },
      orderBy: [
        {
          level: "desc"
        },
        {
          experience: "desc"
        },
        {
          acquiredAt: "asc"
        }
      ],
      take: Math.max(100, limit * 10)
    }
  );
  const userIds = [...new Set(candidates.map((lion) => lion.userId))];
  const profiles =
    userIds.length > 0
      ? ((await store.userProfile.findMany?.({
          where: {
            guildId: input.guildId,
            userId: {
              in: userIds
            }
          }
        })) ?? [])
      : [];
  const profileByUserId = new Map(
    profiles.map((profile) => [profile.userId, profile])
  );

  return candidates
    .map((lion) => ({
      lion,
      ownerDisplayName: getStoredOwnerDisplayName(lion, profileByUserId),
      score: calculateTopLionScore(lion)
    }))
    .sort((first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score;
      }

      if (second.lion.level !== first.lion.level) {
        return second.lion.level - first.lion.level;
      }

      return first.lion.acquiredAt.getTime() - second.lion.acquiredAt.getTime();
    })
    .slice(0, limit)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));
};

export const listUserLionTeam = async (
  store: Pick<LionCreatureStore, "userLionTeamSlot">,
  input: {
    guildId: string;
    userId: string;
  }
): Promise<UserLionTeamSlotWithLionRecord[]> => {
  const slots = await store.userLionTeamSlot.findMany({
    where: {
      guildId: input.guildId,
      userId: input.userId
    },
    include: {
      lion: {
        include: {
          species: true
        }
      }
    },
    orderBy: [{ slot: "asc" }]
  });

  return slots.filter(
    (slot: UserLionTeamSlotWithLionRecord) =>
      slot.slot >= 1 &&
      slot.slot <= MAX_LION_TEAM_SIZE &&
      slot.lion.guildId === input.guildId &&
      slot.lion.userId === input.userId
  );
};

export const clearUserLionTeam = async (
  store: Pick<LionCreatureStore, "userLionTeamSlot">,
  input: {
    guildId: string;
    userId: string;
  }
): Promise<number> => {
  const result = await store.userLionTeamSlot.deleteMany({
    where: {
      guildId: input.guildId,
      userId: input.userId
    }
  });

  return result.count;
};

export const setUserLionTeam = async (
  store: Pick<LionCreatureStore, "userLion" | "userLionTeamSlot">,
  input: {
    guildId: string;
    userId: string;
    queries: string[];
  }
): Promise<SetUserLionTeamResult> => {
  const queries = input.queries.map((query) => query.trim()).filter(Boolean);

  if (queries.length === 0) {
    return {
      outcome: "empty_team",
      team: [],
      failedQuery: null
    };
  }

  if (queries.length > MAX_LION_TEAM_SIZE) {
    return {
      outcome: "too_many_lions",
      team: [],
      failedQuery: null
    };
  }

  const ownedLions = await listUserLions(store, {
    guildId: input.guildId,
    userId: input.userId,
    limit: 200
  });
  const selectedLions: UserLionWithSpeciesRecord[] = [];
  const selectedLionIds = new Set<string>();

  for (const query of queries) {
    const lion = findUserLionFromList(ownedLions, query);

    if (!lion) {
      return {
        outcome: "lion_not_found",
        team: [],
        failedQuery: query
      };
    }

    if (selectedLionIds.has(lion.id)) {
      return {
        outcome: "duplicate_lion",
        team: [],
        failedQuery: query
      };
    }

    selectedLionIds.add(lion.id);
    selectedLions.push(lion);
  }

  const writeTeam = async (
    teamStore: Pick<LionCreatureStore, "userLionTeamSlot">
  ): Promise<UserLionTeamSlotWithLionRecord[]> => {
    await teamStore.userLionTeamSlot.deleteMany({
      where: {
        guildId: input.guildId,
        userId: input.userId
      }
    });

    for (const [index, lion] of selectedLions.entries()) {
      await teamStore.userLionTeamSlot.create({
        data: {
          guildId: input.guildId,
          userId: input.userId,
          slot: index + 1,
          userLionId: lion.id
        }
      });
    }

    return listUserLionTeam(teamStore, input);
  };
  const transactionalStore = store as unknown as {
    $transaction?: <T>(
      callback: (tx: LionCreatureStore) => Promise<T>
    ) => Promise<T>;
  };
  const team =
    typeof transactionalStore.$transaction === "function"
      ? await transactionalStore.$transaction((tx) => writeTeam(tx))
      : await writeTeam(store);

  return {
    outcome: "set",
    team,
    failedQuery: null
  };
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

export const useLionTrainingItem = async (
  store: Pick<
    LionCreatureStore,
    "lionShopItemDefinition" | "userItemInventory" | "userLion"
  >,
  input: {
    guildId: string;
    userId: string;
    itemKey: string;
    lionQuery: string;
  }
): Promise<UseLionTrainingItemResult> => {
  const itemKey = normalizeLionItemKey(input.itemKey);
  const item = await store.lionShopItemDefinition.findUnique({
    where: {
      itemKey
    }
  });

  if (!item || !item.isEnabled) {
    return {
      outcome: "item_not_found",
      item: null,
      result: null,
      failedQuery: null
    };
  }

  if (item.category !== "UTILITY" || item.effectType !== "TRAINING_XP") {
    return {
      outcome: "not_training_item",
      item,
      result: null,
      failedQuery: null
    };
  }

  const lion = await getUserLionByQuery(store, {
    guildId: input.guildId,
    userId: input.userId,
    query: input.lionQuery
  });

  if (!lion) {
    return {
      outcome: "lion_not_found",
      item,
      result: null,
      failedQuery: input.lionQuery
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
      item,
      result: null,
      failedQuery: null
    };
  }

  const result = await awardLionExperience(store, {
    lion,
    gainedExperience: item.effectValue
  });

  return {
    outcome: "used",
    item,
    result,
    failedQuery: null
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

export const getUserLionBattleCooldown = async (
  store: Pick<LionCreatureStore, "lionBattleRecord">,
  input: {
    guildId: string;
    challengerUserId: string;
    opponentUserId: string;
    now: Date;
  }
): Promise<UserLionBattleCooldownResult> => {
  const cooldownStartedAfter = new Date(
    input.now.getTime() - LION_USER_BATTLE_COOLDOWN_MS
  );
  const latestBattle: LionBattleRecord | null =
    await store.lionBattleRecord.findFirst({
      where: {
        guildId: input.guildId,
        createdAt: {
          gt: cooldownStartedAfter
        },
        OR: [
          {
            challengerUserId: {
              in: [input.challengerUserId, input.opponentUserId]
            }
          },
          {
            opponentUserId: {
              in: [input.challengerUserId, input.opponentUserId]
            }
          }
        ]
      },
      orderBy: [{ createdAt: "desc" }]
    });

  if (!latestBattle) {
    return {
      allowed: true,
      cooldownEndsAt: null,
      latestBattle: null
    };
  }

  return {
    allowed: false,
    cooldownEndsAt: new Date(
      latestBattle.createdAt.getTime() + LION_USER_BATTLE_COOLDOWN_MS
    ),
    latestBattle
  };
};

export const recordLionBattle = async (
  store: Pick<LionCreatureStore, "lionBattleRecord">,
  input: RecordLionBattleInput
): Promise<LionBattleRecord> => {
  return store.lionBattleRecord.create({
    data: {
      guildId: input.guildId,
      challengerUserId: input.challengerUserId,
      challengerDisplayName: input.challengerDisplayName,
      opponentUserId: input.opponentUserId,
      opponentDisplayName: input.opponentDisplayName,
      winnerUserId: input.winnerUserId,
      winnerDisplayName: input.winnerDisplayName,
      loserUserId: input.loserUserId,
      loserDisplayName: input.loserDisplayName,
      winnerSide: input.winnerSide,
      challengerTeamLionIds: JSON.stringify(input.challengerTeamLionIds),
      opponentTeamLionIds: JSON.stringify(input.opponentTeamLionIds),
      participantLionIds: JSON.stringify(input.participantLionIds),
      mvpLionId: input.mvpLionId,
      mvpLionName: input.mvpLionName,
      roundsCount: Math.max(0, Math.floor(input.roundsCount)),
      createdAt: input.createdAt
    }
  });
};

export const listRecentLionBattles = async (
  store: Pick<LionCreatureStore, "lionBattleRecord">,
  input: {
    guildId: string;
    userId?: string;
    limit?: number;
  }
): Promise<LionBattleRecord[]> => {
  const limit = Math.min(10, Math.max(1, input.limit ?? 5));

  return store.lionBattleRecord.findMany({
    where: {
      guildId: input.guildId,
      OR: input.userId
        ? [
            {
              challengerUserId: input.userId
            },
            {
              opponentUserId: input.userId
            }
          ]
        : undefined
    },
    orderBy: [{ createdAt: "desc" }],
    take: limit
  });
};

export const setLionSpeciesEnabled = async (
  store: Pick<LionCreatureStore, "lionSpecies">,
  input: {
    publicIdOrSlug: string;
    enabled: boolean;
  }
): Promise<AdminLionMutationResult<LionSpeciesRecord>> => {
  const query = input.publicIdOrSlug.trim();
  const normalizedQuery = normalizeLionSearchQuery(query);
  const species: LionSpeciesRecord | null = await store.lionSpecies.findFirst({
    where: {
      OR: [
        {
          publicId: query.toUpperCase()
        },
        {
          slug: normalizedQuery
        }
      ]
    }
  });

  if (!species) {
    return {
      outcome: "not_found",
      record: null,
      error: null
    };
  }

  const record = await store.lionSpecies.update({
    where: {
      id: species.id
    },
    data: {
      isEnabled: input.enabled
    }
  });

  return {
    outcome: "updated",
    record,
    error: null
  };
};

export const tuneLionSpecies = async (
  store: Pick<LionCreatureStore, "lionSpecies">,
  input: {
    publicIdOrSlug: string;
    spawnWeight?: number | null;
    baseCatchRate?: number | null;
  }
): Promise<AdminLionMutationResult<LionSpeciesRecord>> => {
  const query = input.publicIdOrSlug.trim();
  const normalizedQuery = normalizeLionSearchQuery(query);
  const species: LionSpeciesRecord | null = await store.lionSpecies.findFirst({
    where: {
      OR: [
        {
          publicId: query.toUpperCase()
        },
        {
          slug: normalizedQuery
        }
      ]
    }
  });

  if (!species) {
    return {
      outcome: "not_found",
      record: null,
      error: null
    };
  }

  const data: {
    spawnWeight?: number;
    baseCatchRate?: number;
  } = {};

  if (input.spawnWeight !== null && input.spawnWeight !== undefined) {
    data.spawnWeight = Math.max(0, Math.floor(input.spawnWeight));
  }

  if (input.baseCatchRate !== null && input.baseCatchRate !== undefined) {
    data.baseCatchRate = Math.min(
      95,
      Math.max(5, Math.floor(input.baseCatchRate))
    );
  }

  if (Object.keys(data).length === 0) {
    return {
      outcome: "invalid",
      record: null,
      error: "Choose at least one species field to tune."
    };
  }

  const record = await store.lionSpecies.update({
    where: {
      id: species.id
    },
    data
  });

  return {
    outcome: "updated",
    record,
    error: null
  };
};

export const setLionShopItemEnabled = async (
  store: Pick<LionCreatureStore, "lionShopItemDefinition">,
  input: {
    itemKey: string;
    enabled: boolean;
  }
): Promise<AdminLionMutationResult<LionShopItemRecord>> => {
  const itemKey = normalizeLionItemKey(input.itemKey);
  const item = await store.lionShopItemDefinition.findUnique({
    where: {
      itemKey
    }
  });

  if (!item) {
    return {
      outcome: "not_found",
      record: null,
      error: null
    };
  }

  const record = await store.lionShopItemDefinition.update({
    where: {
      itemKey
    },
    data: {
      isEnabled: input.enabled
    }
  });

  return {
    outcome: "updated",
    record,
    error: null
  };
};

export const tuneLionShopItem = async (
  store: Pick<LionCreatureStore, "lionShopItemDefinition">,
  input: {
    itemKey: string;
    priceCoins?: number | null;
    effectValue?: number | null;
  }
): Promise<AdminLionMutationResult<LionShopItemRecord>> => {
  const itemKey = normalizeLionItemKey(input.itemKey);
  const item = await store.lionShopItemDefinition.findUnique({
    where: {
      itemKey
    }
  });

  if (!item) {
    return {
      outcome: "not_found",
      record: null,
      error: null
    };
  }

  const data: {
    priceCoins?: number;
    effectValue?: number;
  } = {};

  if (input.priceCoins !== null && input.priceCoins !== undefined) {
    data.priceCoins = Math.max(0, Math.floor(input.priceCoins));
  }

  if (input.effectValue !== null && input.effectValue !== undefined) {
    data.effectValue = Math.max(0, Math.floor(input.effectValue));
  }

  if (Object.keys(data).length === 0) {
    return {
      outcome: "invalid",
      record: null,
      error: "Choose at least one item field to tune."
    };
  }

  const record = await store.lionShopItemDefinition.update({
    where: {
      itemKey
    },
    data
  });

  return {
    outcome: "updated",
    record,
    error: null
  };
};

export const clearActiveWildLionSpawns = async (
  store: Pick<LionCreatureStore, "activeLionSpawn">,
  input: {
    guildId: string;
    channelId?: string;
  }
): Promise<number> => {
  const result = await store.activeLionSpawn.updateMany({
    where: {
      guildId: input.guildId,
      channelId: input.channelId,
      status: "ACTIVE"
    },
    data: {
      status: "EXPIRED"
    }
  });

  return result.count;
};

export const clearActiveLionChannelEffects = async (
  store: Pick<LionCreatureStore, "lionChannelEffect">,
  input: {
    guildId: string;
    channelId?: string;
    now: Date;
  }
): Promise<number> => {
  const result = await store.lionChannelEffect.deleteMany({
    where: {
      guildId: input.guildId,
      channelId: input.channelId,
      expiresAt: {
        gt: input.now
      }
    }
  });

  return result.count;
};

export const grantLionItem = async (
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
): Promise<GrantLionItemResult> => {
  const itemKey = normalizeLionItemKey(input.itemKey);
  const quantity = Math.max(1, Math.floor(input.quantity));
  const item = await store.lionShopItemDefinition.findUnique({
    where: {
      itemKey
    }
  });

  if (!item) {
    return {
      outcome: "item_not_found",
      item: null,
      inventory: null
    };
  }

  await getOrCreateProfile(store, {
    guildId: input.guildId,
    userId: input.userId,
    displayName: input.displayName
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
    outcome: "granted",
    item,
    inventory
  };
};

export const getLionLevelSummary = (
  lion: UserLionWithSpeciesRecord
): string => {
  const progress = getLionExperienceProgress(lion.experience);

  return `Lv. ${lion.level} | ${progress.xpNeededForNextLevel} XP to next`;
};

export type LionRarityValue =
  | "COMMON"
  | "UNCOMMON"
  | "RARE"
  | "EPIC"
  | "LEGENDARY";

export type LionElementValue =
  | "NEUTRAL"
  | "FIRE"
  | "WATER"
  | "EARTH"
  | "WIND"
  | "LIGHT"
  | "SHADOW"
  | "METAL"
  | "NATURE";

export type LionItemCategoryValue = "BALL" | "SPAWN_MODIFIER" | "UTILITY";

export type LionItemEffectTypeValue =
  | "CATCH_MODIFIER"
  | "SPAWN_BOOST"
  | "RARITY_BOOST"
  | "TYPE_ATTRACTOR";

export interface LionSpeciesSeed {
  slug: string;
  name: string;
  imagePath: string;
  rarity: LionRarityValue;
  baseCatchRate: number;
  baseValue: number;
  spawnWeight: number;
  primaryType: LionElementValue;
  secondaryType: LionElementValue | null;
  description: string;
}

export interface LionShopItemSeed {
  itemKey: string;
  name: string;
  category: LionItemCategoryValue;
  priceCoins: number;
  effectType: LionItemEffectTypeValue;
  effectValue: number;
  description: string;
}

const buildSpeciesSeed = (
  index: number,
  input: {
    rarity: LionRarityValue;
    baseCatchRate: number;
    baseValue: number;
    spawnWeight: number;
  }
): LionSpeciesSeed => {
  const paddedIndex = index.toString().padStart(3, "0");

  return {
    slug: `rdl-lion-${paddedIndex}`,
    name: `RDL Lion ${paddedIndex}`,
    imagePath: `assets/lions/cards/rdl-lion-${paddedIndex}.jpg`,
    rarity: input.rarity,
    baseCatchRate: input.baseCatchRate,
    baseValue: input.baseValue,
    spawnWeight: input.spawnWeight,
    primaryType: "NEUTRAL",
    secondaryType: null,
    description: "A prototype LionDen creature seeded from the local RDL photo set."
  };
};

export const DEFAULT_LION_SPECIES: LionSpeciesSeed[] = [
  ...Array.from({ length: 12 }, (_, index) =>
    buildSpeciesSeed(index + 1, {
      rarity: "COMMON",
      baseCatchRate: 70,
      baseValue: 1,
      spawnWeight: 100
    })
  ),
  ...Array.from({ length: 8 }, (_, index) =>
    buildSpeciesSeed(index + 13, {
      rarity: "UNCOMMON",
      baseCatchRate: 60,
      baseValue: 3,
      spawnWeight: 55
    })
  ),
  ...Array.from({ length: 4 }, (_, index) =>
    buildSpeciesSeed(index + 21, {
      rarity: "RARE",
      baseCatchRate: 45,
      baseValue: 8,
      spawnWeight: 25
    })
  ),
  ...Array.from({ length: 2 }, (_, index) =>
    buildSpeciesSeed(index + 25, {
      rarity: "EPIC",
      baseCatchRate: 30,
      baseValue: 20,
      spawnWeight: 10
    })
  ),
  buildSpeciesSeed(27, {
    rarity: "LEGENDARY",
    baseCatchRate: 18,
    baseValue: 50,
    spawnWeight: 3
  })
];

export const DEFAULT_LION_SHOP_ITEMS: LionShopItemSeed[] = [
  {
    itemKey: "basic-ball",
    name: "Basic Ball",
    category: "BALL",
    priceCoins: 10,
    effectType: "CATCH_MODIFIER",
    effectValue: 0,
    description: "A standard catching item for common wild lions."
  },
  {
    itemKey: "great-ball",
    name: "Great Ball",
    category: "BALL",
    priceCoins: 25,
    effectType: "CATCH_MODIFIER",
    effectValue: 15,
    description: "A stronger catching item with a better success rate."
  },
  {
    itemKey: "ultra-ball",
    name: "Ultra Ball",
    category: "BALL",
    priceCoins: 60,
    effectType: "CATCH_MODIFIER",
    effectValue: 30,
    description: "A premium catching item for difficult wild lions."
  },
  {
    itemKey: "activity-lure",
    name: "Activity Lure",
    category: "SPAWN_MODIFIER",
    priceCoins: 50,
    effectType: "SPAWN_BOOST",
    effectValue: 20,
    description: "A future spawn modifier for increasing wild lion activity."
  },
  {
    itemKey: "rare-lure",
    name: "Rare Lure",
    category: "SPAWN_MODIFIER",
    priceCoins: 100,
    effectType: "RARITY_BOOST",
    effectValue: 10,
    description: "A future spawn modifier for nudging wild spawns toward rarer lions."
  }
];

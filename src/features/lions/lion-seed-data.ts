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
  | "TYPE_ATTRACTOR"
  | "LEVEL_BOOST"
  | "TRAINING_XP";

export interface LionSpeciesSeed {
  publicId: string;
  slug: string;
  name: string;
  imagePath: string;
  rarity: LionRarityValue;
  baseCatchRate: number;
  baseValue: number;
  spawnWeight: number;
  primaryType: LionElementValue;
  secondaryType: LionElementValue | null;
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
  baseSpeed: number;
  abilityKey: string;
  abilityName: string;
  abilityDescription: string;
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
    primaryType: LionElementValue;
    secondaryType?: LionElementValue | null;
    baseHp: number;
    baseAttack: number;
    baseDefense: number;
    baseSpeed: number;
    abilityKey: string;
    abilityName: string;
    abilityDescription: string;
  }
): LionSpeciesSeed => {
  const paddedIndex = index.toString().padStart(3, "0");

  return {
    publicId: `L${paddedIndex}`,
    slug: `rdl-lion-${paddedIndex}`,
    name: `RDL Lion ${paddedIndex}`,
    imagePath: `assets/lions/cards/rdl-lion-${paddedIndex}.jpg`,
    rarity: input.rarity,
    baseCatchRate: input.baseCatchRate,
    baseValue: input.baseValue,
    spawnWeight: input.spawnWeight,
    primaryType: input.primaryType,
    secondaryType: input.secondaryType ?? null,
    baseHp: input.baseHp,
    baseAttack: input.baseAttack,
    baseDefense: input.baseDefense,
    baseSpeed: input.baseSpeed,
    abilityKey: input.abilityKey,
    abilityName: input.abilityName,
    abilityDescription: input.abilityDescription,
    description:
      "A prototype LionDen creature seeded from the local RDL photo set."
  };
};

export const DEFAULT_LION_SPECIES: LionSpeciesSeed[] = [
  ...Array.from({ length: 12 }, (_, index) =>
    buildSpeciesSeed(index + 1, {
      rarity: "COMMON",
      baseCatchRate: 70,
      baseValue: 1,
      spawnWeight: 100,
      primaryType: index % 2 === 0 ? "NEUTRAL" : "EARTH",
      baseHp: 48 + (index % 3) * 2,
      baseAttack: 10 + (index % 2),
      baseDefense: 9 + (index % 3),
      baseSpeed: 10 + (index % 4),
      abilityKey: "steady-heart",
      abilityName: "Steady Heart",
      abilityDescription:
        "A dependable passive trait reserved for future battle effects."
    })
  ),
  ...Array.from({ length: 8 }, (_, index) =>
    buildSpeciesSeed(index + 13, {
      rarity: "UNCOMMON",
      baseCatchRate: 60,
      baseValue: 3,
      spawnWeight: 55,
      primaryType: ["FIRE", "WATER", "WIND", "NATURE"][
        index % 4
      ] as LionElementValue,
      baseHp: 55 + (index % 3) * 2,
      baseAttack: 12 + (index % 3),
      baseDefense: 11 + (index % 2),
      baseSpeed: 11 + (index % 4),
      abilityKey: "quick-pounce",
      abilityName: "Quick Pounce",
      abilityDescription:
        "A speed-oriented passive trait reserved for future battle effects."
    })
  ),
  ...Array.from({ length: 4 }, (_, index) =>
    buildSpeciesSeed(index + 21, {
      rarity: "RARE",
      baseCatchRate: 45,
      baseValue: 8,
      spawnWeight: 25,
      primaryType: ["LIGHT", "SHADOW", "METAL", "FIRE"][
        index
      ] as LionElementValue,
      secondaryType: index === 3 ? "WIND" : null,
      baseHp: 64 + (index % 2) * 3,
      baseAttack: 15 + index,
      baseDefense: 13 + (index % 3),
      baseSpeed: 13 + index,
      abilityKey: "pride-guard",
      abilityName: "Pride Guard",
      abilityDescription:
        "A defensive passive trait reserved for future battle effects."
    })
  ),
  ...Array.from({ length: 2 }, (_, index) =>
    buildSpeciesSeed(index + 25, {
      rarity: "EPIC",
      baseCatchRate: 30,
      baseValue: 20,
      spawnWeight: 10,
      primaryType: index === 0 ? "LIGHT" : "SHADOW",
      secondaryType: "METAL",
      baseHp: 76 + index * 4,
      baseAttack: 18 + index * 2,
      baseDefense: 16 + index,
      baseSpeed: 15 + index * 2,
      abilityKey: "royal-roar",
      abilityName: "Royal Roar",
      abilityDescription:
        "A pressure-based passive trait reserved for future battle effects."
    })
  ),
  buildSpeciesSeed(27, {
    rarity: "LEGENDARY",
    baseCatchRate: 18,
    baseValue: 50,
    spawnWeight: 3,
    primaryType: "LIGHT",
    secondaryType: "SHADOW",
    baseHp: 90,
    baseAttack: 22,
    baseDefense: 19,
    baseSpeed: 18,
    abilityKey: "lionheart",
    abilityName: "Lionheart",
    abilityDescription:
      "A legendary passive trait reserved for future battle effects."
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
    description:
      "Marks this channel as a preferred target for the next automated wild lion spawn."
  },
  {
    itemKey: "rare-lure",
    name: "Rare Lure",
    category: "SPAWN_MODIFIER",
    priceCoins: 100,
    effectType: "RARITY_BOOST",
    effectValue: 10,
    description:
      "Boosts rare, epic, and legendary spawn weights in this channel."
  },
  {
    itemKey: "level-lure",
    name: "Level Lure",
    category: "SPAWN_MODIFIER",
    priceCoins: 90,
    effectType: "LEVEL_BOOST",
    effectValue: 8,
    description:
      "Raises wild lion encounter levels in this channel for a limited time."
  },
  {
    itemKey: "training-snack",
    name: "Training Snack",
    category: "UTILITY",
    priceCoins: 40,
    effectType: "TRAINING_XP",
    effectValue: 60,
    description:
      "A consumable treat that gives one owned lion bonus XP without waiting for training cooldown."
  }
];

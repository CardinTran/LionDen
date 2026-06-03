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

export { DEFAULT_LION_SPECIES } from "./generated-lion-species.js";

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

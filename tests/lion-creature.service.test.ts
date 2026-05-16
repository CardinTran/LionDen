import { describe, expect, it, vi } from "vitest";

import {
  attemptCatchWildLion,
  calculateCatchChance,
  chooseWeightedLionSpecies,
  createWildLionSpawn,
  purchaseLionShopItem,
  type ActiveLionSpawnWithSpeciesRecord,
  type LionShopItemRecord,
  type LionSpeciesRecord,
  type UserItemInventoryRecord,
  type UserLionWithSpeciesRecord
} from "../src/features/lions/lion-creature.service.js";
import type { UserProfileRecord } from "../src/features/profiles/profile.service.js";

const now = new Date("2026-05-15T12:00:00.000Z");

const buildProfile = (
  overrides: Partial<UserProfileRecord> = {}
): UserProfileRecord => ({
  id: "profile_123",
  guildId: "guild_123",
  userId: "user_123",
  displayName: "Cardin",
  xp: 0,
  level: 1,
  coins: 100,
  lastMessageXpAt: null,
  lastDailyClaimAt: null,
  createdAt: now,
  updatedAt: now,
  ...overrides
});

const buildSpecies = (
  overrides: Partial<LionSpeciesRecord> = {}
): LionSpeciesRecord => ({
  id: "species_123",
  publicId: "L001",
  slug: "rdl-lion-001",
  name: "RDL Lion 001",
  imagePath: "assets/lions/cards/rdl-lion-001.jpg",
  rarity: "COMMON",
  baseCatchRate: 70,
  baseValue: 1,
  spawnWeight: 100,
  primaryType: "NEUTRAL",
  secondaryType: null,
  baseHp: 50,
  baseAttack: 10,
  baseDefense: 10,
  baseSpeed: 10,
  abilityKey: "steady-heart",
  abilityName: "Steady Heart",
  abilityDescription: "A dependable passive trait.",
  description: "A local test lion.",
  isEnabled: true,
  createdAt: now,
  updatedAt: now,
  ...overrides
});

const buildItem = (
  overrides: Partial<LionShopItemRecord> = {}
): LionShopItemRecord => ({
  id: "item_123",
  itemKey: "great-ball",
  name: "Great Ball",
  category: "BALL",
  priceCoins: 25,
  effectType: "CATCH_MODIFIER",
  effectValue: 15,
  description: "A stronger catching item.",
  isEnabled: true,
  createdAt: now,
  updatedAt: now,
  ...overrides
});

const buildInventory = (
  overrides: Partial<UserItemInventoryRecord> = {}
): UserItemInventoryRecord => ({
  id: "inventory_123",
  guildId: "guild_123",
  userId: "user_123",
  itemKey: "great-ball",
  quantity: 2,
  createdAt: now,
  updatedAt: now,
  ...overrides
});

const buildSpawn = (
  overrides: Partial<ActiveLionSpawnWithSpeciesRecord> = {}
): ActiveLionSpawnWithSpeciesRecord => ({
  id: "spawn_123",
  guildId: "guild_123",
  channelId: "channel_123",
  lionSpeciesId: "species_123",
  messageId: "message_123",
  status: "ACTIVE",
  spawnedAt: now,
  expiresAt: new Date(now.getTime() + 60_000),
  caughtByUserId: null,
  caughtByDisplayName: null,
  caughtAt: null,
  createdAt: now,
  updatedAt: now,
  species: buildSpecies(),
  ...overrides
});

describe("lion creature service", () => {
  it("clamps catch chance into a playable range", () => {
    expect(
      calculateCatchChance({
        baseCatchRate: 2,
        catchModifier: 0
      })
    ).toBe(5);
    expect(
      calculateCatchChance({
        baseCatchRate: 90,
        catchModifier: 20
      })
    ).toBe(95);
  });

  it("chooses species by spawn weight", () => {
    const common = buildSpecies({
      id: "common",
      slug: "common",
      spawnWeight: 100
    });
    const rare = buildSpecies({
      id: "rare",
      slug: "rare",
      spawnWeight: 1
    });

    expect(chooseWeightedLionSpecies([common, rare], () => 0)?.id).toBe(
      "common"
    );
    expect(chooseWeightedLionSpecies([common, rare], () => 0.999)?.id).toBe(
      "rare"
    );
  });

  it("purchases shop items with coins and adds inventory", async () => {
    let profile = buildProfile({
      coins: 100
    });
    let inventory = buildInventory({
      quantity: 0
    });

    const store = {
      lionShopItemDefinition: {
        findUnique: vi.fn().mockResolvedValue(buildItem())
      },
      userProfile: {
        upsert: vi.fn(async ({ update }) => {
          profile = {
            ...profile,
            displayName: update.displayName
          };
          return profile;
        }),
        update: vi.fn(async ({ data }) => {
          profile = {
            ...profile,
            displayName: data.displayName,
            coins: data.coins ?? profile.coins
          };
          return profile;
        })
      },
      userItemInventory: {
        upsert: vi.fn(async ({ create, update }) => {
          inventory = {
            ...inventory,
            guildId: create.guildId,
            userId: create.userId,
            itemKey: create.itemKey,
            quantity: inventory.quantity + update.quantity.increment
          };
          return inventory;
        })
      }
    };

    const result = await purchaseLionShopItem(store, {
      guildId: "guild_123",
      userId: "user_123",
      displayName: "Cardin",
      itemKey: "great-ball",
      quantity: 2
    });

    expect(result.outcome).toBe("purchased");
    expect(result.profile.coins).toBe(50);
    expect(result.inventory?.quantity).toBe(2);
  });

  it("creates a wild spawn when the channel has no active spawn", async () => {
    const spawn = buildSpawn();
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const findFirst = vi.fn().mockResolvedValue(null);
    const create = vi.fn().mockResolvedValue(spawn);

    const result = await createWildLionSpawn(
      {
        activeLionSpawn: {
          updateMany,
          findFirst,
          create
        },
        lionChannelEffect: {
          findFirst: vi.fn().mockResolvedValue(null)
        },
        lionSpecies: {
          findMany: vi.fn().mockResolvedValue([buildSpecies()])
        }
      } as never,
      {
        guildId: "guild_123",
        channelId: "channel_123",
        now,
        random: () => 0
      }
    );

    expect(result.outcome).toBe("spawned");
    expect(create).toHaveBeenCalled();
  });

  it("does not create a second wild spawn in the same active channel", async () => {
    const activeSpawn = buildSpawn();

    const result = await createWildLionSpawn(
      {
        activeLionSpawn: {
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          findFirst: vi.fn().mockResolvedValue(activeSpawn),
          create: vi.fn()
        },
        lionChannelEffect: {
          findFirst: vi.fn().mockResolvedValue(null)
        },
        lionSpecies: {
          findMany: vi.fn()
        }
      } as never,
      {
        guildId: "guild_123",
        channelId: "channel_123",
        now,
        random: () => 0
      }
    );

    expect(result.outcome).toBe("active_spawn_exists");
    expect(result.spawn?.id).toBe("spawn_123");
  });

  it("catches a wild lion and creates an owned lion", async () => {
    const spawn = buildSpawn();
    const item = buildItem();
    const inventory = buildInventory();
    const ownedLion: UserLionWithSpeciesRecord = {
      id: "owned_123",
      guildId: "guild_123",
      userId: "user_123",
      lionSpeciesId: "species_123",
      nickname: null,
      level: 1,
      experience: 0,
      sourceType: "WILD_CATCH",
      sourceReferenceId: "spawn_123",
      acquiredAt: now,
      createdAt: now,
      updatedAt: now,
      species: spawn.species
    };

    const updateMany = vi.fn(async ({ where }) => {
      if (where.expiresAt) {
        return { count: 0 };
      }

      return { count: 1 };
    });

    const result = await attemptCatchWildLion(
      {
        activeLionSpawn: {
          updateMany,
          findFirst: vi.fn().mockResolvedValue(spawn)
        },
        lionShopItemDefinition: {
          findUnique: vi.fn().mockResolvedValue(item)
        },
        userItemInventory: {
          findUnique: vi.fn().mockResolvedValue(inventory),
          updateMany: vi.fn().mockResolvedValue({ count: 1 })
        },
        userLion: {
          create: vi.fn().mockResolvedValue(ownedLion)
        }
      } as never,
      {
        guildId: "guild_123",
        channelId: "channel_123",
        userId: "user_123",
        displayName: "Cardin",
        itemKey: "great-ball",
        now,
        random: () => 0
      }
    );

    expect(result.outcome).toBe("caught");
    expect(result.catchChance).toBe(85);
    expect(result.ownedLion?.id).toBe("owned_123");
  });

  it("consumes the ball and leaves the spawn active when catch misses", async () => {
    const inventoryUpdate = vi.fn().mockResolvedValue({ count: 1 });

    const result = await attemptCatchWildLion(
      {
        activeLionSpawn: {
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          findFirst: vi.fn().mockResolvedValue(buildSpawn())
        },
        lionShopItemDefinition: {
          findUnique: vi.fn().mockResolvedValue(buildItem())
        },
        userItemInventory: {
          findUnique: vi.fn().mockResolvedValue(buildInventory()),
          updateMany: inventoryUpdate
        },
        userLion: {
          create: vi.fn()
        }
      } as never,
      {
        guildId: "guild_123",
        channelId: "channel_123",
        userId: "user_123",
        displayName: "Cardin",
        itemKey: "great-ball",
        now,
        random: () => 0.99
      }
    );

    expect(result.outcome).toBe("missed");
    expect(inventoryUpdate).toHaveBeenCalled();
  });
});

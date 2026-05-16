import { describe, expect, it, vi } from "vitest";

import {
  awardBattleLionExperience,
  attemptCatchWildLion,
  calculateCatchChance,
  chooseWeightedLionSpecies,
  clearUserLionTeam,
  createWildLionSpawn,
  generateWildLionSpawnLevel,
  listUserLionTeam,
  listTopOwnedLions,
  LION_BATTLE_WIN_XP,
  LION_TRAINING_XP,
  purchaseLionShopItem,
  setUserLionTeam,
  trainUserLion,
  type ActiveLionSpawnWithSpeciesRecord,
  type LionShopItemRecord,
  type LionSpeciesRecord,
  type UserItemInventoryRecord,
  type UserLionTeamSlotWithLionRecord,
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
  level: 1,
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

const buildOwnedLion = (
  overrides: Partial<UserLionWithSpeciesRecord> = {}
): UserLionWithSpeciesRecord => ({
  id: "owned_123",
  guildId: "guild_123",
  userId: "user_123",
  ownerDisplayName: "Cardin",
  lionSpeciesId: "species_123",
  nickname: null,
  level: 1,
  experience: 0,
  sourceType: "WILD_CATCH",
  sourceReferenceId: "spawn_123",
  lastTrainedAt: null,
  lastBattledAt: null,
  acquiredAt: now,
  createdAt: now,
  updatedAt: now,
  species: buildSpecies(),
  ...overrides
});

const buildTeamSlot = (
  overrides: Partial<UserLionTeamSlotWithLionRecord> = {}
): UserLionTeamSlotWithLionRecord => {
  const lion = overrides.lion ?? buildOwnedLion();

  return {
    id: "team_slot_123",
    guildId: lion.guildId,
    userId: lion.userId,
    slot: 1,
    userLionId: lion.id,
    createdAt: now,
    updatedAt: now,
    lion,
    ...overrides
  };
};

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
    expect(
      calculateCatchChance({
        baseCatchRate: 70,
        catchModifier: 15,
        level: 21
      })
    ).toBe(83);
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

  it("generates wild lion levels from conservative rarity tiers", () => {
    const rolls = [0, 0, 0.75, 0, 0.95, 0.999];
    let index = 0;
    const random = (): number => rolls[index++] ?? 0;

    expect(generateWildLionSpawnLevel({ random })).toBe(1);
    expect(generateWildLionSpawnLevel({ random })).toBe(11);
    expect(generateWildLionSpawnLevel({ random })).toBe(50);
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
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          level: 1
        })
      })
    );
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
    const spawn = buildSpawn({
      level: 21
    });
    const item = buildItem();
    const inventory = buildInventory();
    const ownedLion = buildOwnedLion({
      level: spawn.level,
      species: spawn.species
    });
    const create = vi.fn().mockResolvedValue(ownedLion);

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
          create
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
    expect(result.catchChance).toBe(83);
    expect(result.ownedLion?.id).toBe("owned_123");
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ownerDisplayName: "Cardin",
          level: 21
        })
      })
    );
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

  it("prevents duplicate owned lions when a spawn was already caught", async () => {
    const create = vi.fn();

    const result = await attemptCatchWildLion(
      {
        activeLionSpawn: {
          updateMany: vi.fn(async ({ where }) => {
            if (where.expiresAt) {
              return { count: 0 };
            }

            return { count: 0 };
          }),
          findFirst: vi.fn().mockResolvedValue(buildSpawn())
        },
        lionShopItemDefinition: {
          findUnique: vi.fn().mockResolvedValue(buildItem())
        },
        userItemInventory: {
          findUnique: vi.fn().mockResolvedValue(buildInventory()),
          updateMany: vi.fn().mockResolvedValue({ count: 1 })
        },
        userLion: {
          create
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

    expect(result.outcome).toBe("already_caught");
    expect(create).not.toHaveBeenCalled();
  });

  it("trains a lion, awards XP, and stores the training cooldown", async () => {
    const ownedLion = buildOwnedLion();
    const updatedLion = buildOwnedLion({
      experience: LION_TRAINING_XP,
      lastTrainedAt: now
    });
    const update = vi.fn().mockResolvedValue(updatedLion);

    const result = await trainUserLion(
      {
        userLion: {
          findMany: vi.fn().mockResolvedValue([ownedLion]),
          update
        }
      } as never,
      {
        guildId: "guild_123",
        userId: "user_123",
        query: "L001",
        now
      }
    );

    expect(result.outcome).toBe("trained");
    expect(result.result?.gainedExperience).toBe(LION_TRAINING_XP);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          experience: LION_TRAINING_XP,
          lastTrainedAt: now
        })
      })
    );
  });

  it("blocks training while the owned lion is on cooldown", async () => {
    const result = await trainUserLion(
      {
        userLion: {
          findMany: vi.fn().mockResolvedValue([
            buildOwnedLion({
              lastTrainedAt: new Date(now.getTime() - 5 * 60_000)
            })
          ]),
          update: vi.fn()
        }
      } as never,
      {
        guildId: "guild_123",
        userId: "user_123",
        query: "L001",
        now
      }
    );

    expect(result.outcome).toBe("on_cooldown");
    expect(result.cooldownEndsAt?.getTime()).toBeGreaterThan(now.getTime());
  });

  it("sets a user's battle team in requested order", async () => {
    const firstLion = buildOwnedLion({
      id: "owned_001",
      species: buildSpecies({
        id: "species_001",
        publicId: "L001",
        slug: "rdl-lion-001",
        name: "RDL Lion 001"
      })
    });
    const secondLion = buildOwnedLion({
      id: "owned_002",
      species: buildSpecies({
        id: "species_002",
        publicId: "L002",
        slug: "rdl-lion-002",
        name: "RDL Lion 002"
      })
    });
    const thirdLion = buildOwnedLion({
      id: "owned_003",
      species: buildSpecies({
        id: "species_003",
        publicId: "L003",
        slug: "rdl-lion-003",
        name: "RDL Lion 003"
      })
    });
    const create = vi.fn().mockResolvedValue(null);

    const result = await setUserLionTeam(
      {
        userLion: {
          findMany: vi
            .fn()
            .mockResolvedValue([firstLion, secondLion, thirdLion])
        },
        userLionTeamSlot: {
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          create,
          findMany: vi.fn().mockResolvedValue([
            buildTeamSlot({
              id: "slot_001",
              slot: 1,
              userLionId: secondLion.id,
              lion: secondLion
            }),
            buildTeamSlot({
              id: "slot_002",
              slot: 2,
              userLionId: firstLion.id,
              lion: firstLion
            }),
            buildTeamSlot({
              id: "slot_003",
              slot: 3,
              userLionId: thirdLion.id,
              lion: thirdLion
            })
          ])
        }
      } as never,
      {
        guildId: "guild_123",
        userId: "user_123",
        queries: ["L002", "L001", "L003"]
      }
    );

    expect(result.outcome).toBe("set");
    expect(result.team.map((slot) => slot.userLionId)).toEqual([
      secondLion.id,
      firstLion.id,
      thirdLion.id
    ]);
    expect(create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          slot: 1,
          userLionId: secondLion.id
        })
      })
    );
    expect(create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          slot: 2,
          userLionId: firstLion.id
        })
      })
    );
  });

  it("rejects duplicate lions in a battle team", async () => {
    const result = await setUserLionTeam(
      {
        userLion: {
          findMany: vi.fn().mockResolvedValue([buildOwnedLion()])
        },
        userLionTeamSlot: {
          deleteMany: vi.fn(),
          create: vi.fn(),
          findMany: vi.fn()
        }
      } as never,
      {
        guildId: "guild_123",
        userId: "user_123",
        queries: ["L001", "owned_123"]
      }
    );

    expect(result.outcome).toBe("duplicate_lion");
    expect(result.failedQuery).toBe("owned_123");
  });

  it("filters stale team slots that no longer match the guild user owner", async () => {
    const validSlot = buildTeamSlot();
    const staleSlot = buildTeamSlot({
      id: "stale_slot",
      lion: buildOwnedLion({
        id: "stale_owned",
        userId: "other_user"
      }),
      userLionId: "stale_owned"
    });

    const team = await listUserLionTeam(
      {
        userLionTeamSlot: {
          findMany: vi.fn().mockResolvedValue([validSlot, staleSlot])
        }
      } as never,
      {
        guildId: "guild_123",
        userId: "user_123"
      }
    );

    expect(team).toEqual([validSlot]);
  });

  it("clears a user's battle team", async () => {
    const result = await clearUserLionTeam(
      {
        userLionTeamSlot: {
          deleteMany: vi.fn().mockResolvedValue({ count: 2 })
        }
      } as never,
      {
        guildId: "guild_123",
        userId: "user_123"
      }
    );

    expect(result).toBe(2);
  });

  it("lists top owned lions with display names and guild-scoped candidates", async () => {
    const firstLion = buildOwnedLion({
      id: "owned_top",
      ownerDisplayName: "Stored Name",
      level: 15,
      experience: 2_000,
      species: buildSpecies({
        id: "species_top",
        publicId: "L010",
        baseAttack: 30
      })
    });
    const secondLion = buildOwnedLion({
      id: "owned_second",
      userId: "user_456",
      ownerDisplayName: "",
      level: 8,
      experience: 500,
      species: buildSpecies({
        id: "species_second",
        publicId: "L011"
      })
    });

    const entries = await listTopOwnedLions(
      {
        userLion: {
          findMany: vi.fn().mockResolvedValue([secondLion, firstLion])
        },
        userProfile: {
          findMany: vi.fn().mockResolvedValue([
            buildProfile({
              userId: "user_456",
              displayName: "Profile Name"
            })
          ])
        }
      } as never,
      {
        guildId: "guild_123",
        limit: 2
      }
    );

    expect(entries.map((entry) => entry.lion.id)).toEqual([
      "owned_top",
      "owned_second"
    ]);
    expect(entries[0].ownerDisplayName).toBe("Stored Name");
    expect(entries[1].ownerDisplayName).toBe("Profile Name");
  });

  it("awards battle XP and stores the battle cooldown", async () => {
    const updatedLion = buildOwnedLion({
      experience: LION_BATTLE_WIN_XP,
      lastBattledAt: now
    });
    const update = vi.fn().mockResolvedValue(updatedLion);

    const result = await awardBattleLionExperience(
      {
        userLion: {
          update
        }
      } as never,
      {
        lion: buildOwnedLion(),
        gainedExperience: LION_BATTLE_WIN_XP,
        now
      }
    );

    expect(result.outcome).toBe("awarded");
    expect(result.result?.gainedExperience).toBe(LION_BATTLE_WIN_XP);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          experience: LION_BATTLE_WIN_XP,
          lastBattledAt: now
        })
      })
    );
  });
});

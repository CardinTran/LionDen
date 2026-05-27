import { describe, expect, it, vi } from "vitest";

import type {
  LionSpeciesRecord,
  UserLionWithSpeciesRecord
} from "../src/features/lions/lion-creature.service.js";
import {
  feedLion,
  getBondLevelForXp,
  getBondMood,
  getBondProgress,
  getLionBondStatus,
  groomLion,
  type LionBondStore
} from "../src/features/lions/lion-bond.service.js";
import type { FavoriteLionWithLionRecord } from "../src/features/lions/lion-showcase.service.js";

const now = new Date("2026-05-27T12:00:00.000Z");

const buildSpecies = (
  overrides: Partial<LionSpeciesRecord> = {}
): LionSpeciesRecord => ({
  id: "species_123",
  publicId: "L001",
  slug: "southern-lion",
  name: "Southern Lion",
  imagePath: "assets/lions/cards/southern-lion.jpg",
  rarity: "RARE",
  baseCatchRate: 60,
  baseValue: 5,
  spawnWeight: 10,
  primaryType: "FIRE",
  secondaryType: null,
  baseHp: 50,
  baseAttack: 12,
  baseDefense: 9,
  baseSpeed: 10,
  abilityKey: "steady-heart",
  abilityName: "Steady Heart",
  abilityDescription: "No special battle effect yet.",
  description: "A bright lion.",
  isEnabled: true,
  createdAt: now,
  updatedAt: now,
  ...overrides
});

const buildLion = (
  overrides: Partial<UserLionWithSpeciesRecord> = {}
): UserLionWithSpeciesRecord => ({
  id: "lion_123",
  guildId: "guild_123",
  userId: "user_123",
  ownerDisplayName: "Mira",
  lionSpeciesId: "species_123",
  nickname: "Thunder",
  level: 7,
  experience: 240,
  bondXp: 0,
  bondLevel: 1,
  sourceType: "WILD_CATCH",
  sourceReferenceId: "spawn_123",
  lastTrainedAt: null,
  lastBattledAt: null,
  lastFedAt: null,
  lastGroomedAt: null,
  lastBondedAt: null,
  acquiredAt: now,
  createdAt: now,
  updatedAt: now,
  species: buildSpecies(),
  ...overrides
});

const buildFavorite = (
  lion: UserLionWithSpeciesRecord
): FavoriteLionWithLionRecord => ({
  id: "favorite_123",
  guildId: lion.guildId,
  userId: lion.userId,
  lionId: lion.id,
  createdAt: now,
  updatedAt: now,
  lion
});

const createStore = (input: {
  lions?: UserLionWithSpeciesRecord[];
  favorite?: FavoriteLionWithLionRecord | null;
} = {}): {
  store: LionBondStore;
  lions: UserLionWithSpeciesRecord[];
} => {
  const lions = [...(input.lions ?? [])];
  let favorite = input.favorite ?? null;

  return {
    lions,
    store: {
      userLion: {
        findMany: vi.fn(async ({ where }) =>
          lions.filter(
            (lion) =>
              lion.guildId === where.guildId && lion.userId === where.userId
          )
        ),
        update: vi.fn(async ({ where, data }) => {
          const index = lions.findIndex((lion) => lion.id === where.id);

          if (index === -1) {
            throw new Error("missing lion");
          }

          const updated = {
            ...lions[index],
            ...data,
            updatedAt: now
          } as UserLionWithSpeciesRecord;
          lions[index] = updated;

          if (favorite?.lionId === updated.id) {
            favorite = {
              ...favorite,
              lion: updated
            };
          }

          return updated;
        })
      },
      favoriteLion: {
        findUnique: vi.fn(async ({ where }) =>
          favorite &&
          favorite.guildId === where.guildId_userId.guildId &&
          favorite.userId === where.guildId_userId.userId
            ? favorite
            : null
        )
      }
    }
  };
};

describe("lion bond service", () => {
  it("calculates bond levels and moods from cosmetic bond XP", () => {
    expect(getBondLevelForXp(0)).toBe(1);
    expect(getBondLevelForXp(25)).toBe(2);
    expect(getBondLevelForXp(75)).toBe(3);
    expect(getBondLevelForXp(150)).toBe(4);
    expect(getBondLevelForXp(250)).toBe(5);
    expect(getBondProgress(80)).toMatchObject({
      level: 3,
      bondXp: 80,
      nextLevelXp: 150,
      xpNeededForNextLevel: 70
    });
    expect(getBondMood(1)).toBe("Curious");
    expect(getBondMood(3)).toBe("Proud");
    expect(getBondMood(5)).toBe("Legendary Partner");
  });

  it("gets bond status for an explicitly queried owned lion", async () => {
    const lion = buildLion({
      bondXp: 80,
      bondLevel: 3,
      lastFedAt: new Date(now.getTime() - 30 * 60_000)
    });
    const { store } = createStore({
      lions: [lion]
    });

    const result = await getLionBondStatus(store, {
      guildId: "guild_123",
      userId: "user_123",
      query: "Thunder"
    });

    expect(result).toMatchObject({
      outcome: "status",
      status: {
        mood: "Proud",
        progress: {
          level: 3,
          bondXp: 80
        }
      }
    });
    expect(result.outcome === "status" && result.status.feedCooldownEndsAt).toEqual(
      new Date(now.getTime() - 30 * 60_000 + 6 * 60 * 60_000)
    );
  });

  it("uses the favorite lion when no query is provided", async () => {
    const lion = buildLion({
      id: "lion_favorite",
      nickname: "Lucky"
    });
    const { store } = createStore({
      favorite: buildFavorite(lion)
    });

    const result = await getLionBondStatus(store, {
      guildId: "guild_123",
      userId: "user_123"
    });

    expect(result.outcome).toBe("status");
    expect(result.outcome === "status" && result.status.lion.id).toBe(
      "lion_favorite"
    );
  });

  it("returns a helpful no-favorite outcome when no query is provided", async () => {
    const { store } = createStore();

    await expect(
      getLionBondStatus(store, {
        guildId: "guild_123",
        userId: "user_123"
      })
    ).resolves.toMatchObject({
      outcome: "no_favorite",
      status: null
    });
  });

  it("rejects missing or not-owned lions", async () => {
    const { store } = createStore({
      lions: [
        buildLion({
          id: "owned",
          nickname: "Owned"
        })
      ]
    });

    await expect(
      getLionBondStatus(store, {
        guildId: "guild_123",
        userId: "user_123",
        query: "Other Lion"
      })
    ).resolves.toMatchObject({
      outcome: "lion_not_found",
      failedQuery: "Other Lion"
    });
  });

  it("feeds an owned lion, grants bond XP, and detects level ups", async () => {
    const lion = buildLion({
      bondXp: 20,
      bondLevel: 1
    });
    const { store, lions } = createStore({
      lions: [lion]
    });

    const result = await feedLion(store, {
      guildId: "guild_123",
      userId: "user_123",
      query: "Thunder",
      now
    });

    expect(result).toMatchObject({
      outcome: "cared",
      action: "feed",
      gainedBondXp: 5,
      previousLevel: 1,
      nextLevel: 2,
      leveledUp: true
    });
    expect(lions[0]).toMatchObject({
      bondXp: 25,
      bondLevel: 2,
      lastFedAt: now
    });
    expect(store.userLion.update).toHaveBeenCalledTimes(1);
  });

  it("does not mutate bond XP when feed is on cooldown", async () => {
    const lion = buildLion({
      bondXp: 10,
      lastFedAt: new Date(now.getTime() - 60 * 60_000)
    });
    const { store, lions } = createStore({
      lions: [lion]
    });

    const result = await feedLion(store, {
      guildId: "guild_123",
      userId: "user_123",
      query: "Thunder",
      now
    });

    expect(result).toMatchObject({
      outcome: "on_cooldown",
      gainedBondXp: 0,
      nextLevel: 1
    });
    expect(lions[0]?.bondXp).toBe(10);
    expect(store.userLion.update).not.toHaveBeenCalled();
  });

  it("grooms an owned favorite lion with an independent cooldown", async () => {
    const lion = buildLion({
      bondXp: 10,
      lastFedAt: now,
      lastGroomedAt: null
    });
    const { store } = createStore({
      lions: [lion],
      favorite: buildFavorite(lion)
    });

    const result = await groomLion(store, {
      guildId: "guild_123",
      userId: "user_123",
      now
    });

    expect(result).toMatchObject({
      outcome: "cared",
      action: "groom",
      gainedBondXp: 5
    });
    expect(store.userLion.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "lion_123"
        },
        data: {
          bondXp: 15,
          bondLevel: 1,
          lastGroomedAt: now
        }
      })
    );
  });

  it("ignores stale favorite lions that no longer belong to the user", async () => {
    const staleFavorite = buildFavorite(
      buildLion({
        guildId: "other_guild"
      })
    );
    const { store } = createStore({
      favorite: staleFavorite
    });

    await expect(
      feedLion(store, {
        guildId: "guild_123",
        userId: "user_123",
        now
      })
    ).resolves.toMatchObject({
      outcome: "no_favorite",
      gainedBondXp: 0
    });
  });
});

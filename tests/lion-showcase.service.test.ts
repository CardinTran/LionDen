import { describe, expect, it, vi } from "vitest";

import type {
  LionSpeciesRecord,
  UserLionTeamSlotWithLionRecord,
  UserLionWithSpeciesRecord
} from "../src/features/lions/lion-creature.service.js";
import {
  clearFavoriteLion,
  getFavoriteLion,
  setFavoriteLion,
  showcaseOwnedLion,
  type FavoriteLionRecord,
  type LionShowcaseStore
} from "../src/features/lions/lion-showcase.service.js";

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

const buildFavorite = (
  lion: UserLionWithSpeciesRecord,
  overrides: Partial<FavoriteLionRecord> = {}
) => ({
  id: "favorite_123",
  guildId: lion.guildId,
  userId: lion.userId,
  lionId: lion.id,
  createdAt: now,
  updatedAt: now,
  lion,
  ...overrides
});

const createStore = (input: {
  lions?: UserLionWithSpeciesRecord[];
  favorites?: ReturnType<typeof buildFavorite>[];
  team?: UserLionTeamSlotWithLionRecord[];
} = {}): {
  store: LionShowcaseStore;
  favorites: ReturnType<typeof buildFavorite>[];
} => {
  const lions = [...(input.lions ?? [])];
  const favorites = [...(input.favorites ?? [])];
  const team = [...(input.team ?? [])];

  return {
    favorites,
    store: {
      userLion: {
        findMany: vi.fn(async ({ where }) =>
          lions.filter(
            (lion) => lion.guildId === where.guildId && lion.userId === where.userId
          )
        )
      },
      favoriteLion: {
        findUnique: vi.fn(async ({ where }) =>
          favorites.find(
            (favorite) =>
              favorite.guildId === where.guildId_userId.guildId &&
              favorite.userId === where.guildId_userId.userId
          ) ?? null
        ),
        upsert: vi.fn(async ({ where, create, update }) => {
          const existing = favorites.find(
            (favorite) =>
              favorite.guildId === where.guildId_userId.guildId &&
              favorite.userId === where.guildId_userId.userId
          );
          const lion = lions.find(
            (candidate) => candidate.id === (existing ? update.lionId : create.lionId)
          );

          if (!lion) {
            throw new Error("missing lion");
          }

          if (existing) {
            existing.lionId = update.lionId;
            existing.lion = lion;
            return existing;
          }

          const favorite = buildFavorite(lion, {
            guildId: create.guildId,
            userId: create.userId,
            lionId: create.lionId
          });
          favorites.push(favorite);
          return favorite;
        }),
        deleteMany: vi.fn(async ({ where }) => {
          const before = favorites.length;
          for (let index = favorites.length - 1; index >= 0; index -= 1) {
            const favorite = favorites[index];

            if (
              favorite?.guildId === where.guildId &&
              favorite.userId === where.userId
            ) {
              favorites.splice(index, 1);
            }
          }

          return {
            count: before - favorites.length
          };
        })
      },
      userLionTeamSlot: {
        findMany: vi.fn(async ({ where }) =>
          team.filter(
            (slot) => slot.guildId === where.guildId && slot.userId === where.userId
          )
        )
      }
    }
  };
};

describe("lion showcase service", () => {
  it("sets and changes a favorite lion by existing roster lookup", async () => {
    const firstLion = buildLion();
    const secondLion = buildLion({
      id: "lion_456",
      nickname: "Lucky Lion",
      species: buildSpecies({
        id: "species_456",
        publicId: "L002",
        slug: "lucky-lion",
        name: "Lucky Lion"
      })
    });
    const { store, favorites } = createStore({
      lions: [firstLion, secondLion]
    });

    await expect(
      setFavoriteLion(store, {
        guildId: "guild_123",
        userId: "user_123",
        query: "Thunder"
      })
    ).resolves.toMatchObject({
      outcome: "set",
      favorite: {
        lionId: "lion_123"
      }
    });
    await expect(
      setFavoriteLion(store, {
        guildId: "guild_123",
        userId: "user_123",
        query: "\"Lucky Lion\""
      })
    ).resolves.toMatchObject({
      outcome: "set",
      favorite: {
        lionId: "lion_456"
      }
    });
    expect(favorites).toHaveLength(1);
    expect(favorites[0]?.lionId).toBe("lion_456");
  });

  it("rejects favorite requests when the user owns no matching lion", async () => {
    const otherUserLion = buildLion({
      userId: "other_user"
    });
    const { store } = createStore({
      lions: [otherUserLion]
    });

    await expect(
      setFavoriteLion(store, {
        guildId: "guild_123",
        userId: "user_123",
        query: "Thunder"
      })
    ).resolves.toEqual({
      outcome: "no_lions",
      favorite: null
    });
  });

  it("gets and clears a favorite lion idempotently", async () => {
    const lion = buildLion();
    const favorite = buildFavorite(lion);
    const { store } = createStore({
      lions: [lion],
      favorites: [favorite]
    });

    await expect(
      getFavoriteLion(store, {
        guildId: "guild_123",
        userId: "user_123"
      })
    ).resolves.toMatchObject({
      lionId: "lion_123"
    });
    await expect(
      clearFavoriteLion(store, {
        guildId: "guild_123",
        userId: "user_123"
      })
    ).resolves.toEqual({
      outcome: "cleared",
      clearedCount: 1
    });
    await expect(
      clearFavoriteLion(store, {
        guildId: "guild_123",
        userId: "user_123"
      })
    ).resolves.toEqual({
      outcome: "none",
      clearedCount: 0
    });
  });

  it("showcases an explicit owned lion with favorite and team context", async () => {
    const lion = buildLion();
    const favorite = buildFavorite(lion);
    const { store } = createStore({
      lions: [lion],
      favorites: [favorite],
      team: [
        {
          id: "slot_1",
          guildId: "guild_123",
          userId: "user_123",
          slot: 1,
          userLionId: "lion_123",
          createdAt: now,
          updatedAt: now,
          lion
        }
      ]
    });

    await expect(
      showcaseOwnedLion(store, {
        guildId: "guild_123",
        userId: "user_123",
        displayName: "Mira",
        query: "L001"
      })
    ).resolves.toMatchObject({
      outcome: "showcase",
      showcase: {
        lion,
        isFavorite: true,
        teamSlot: 1
      }
    });
  });

  it("showcases the favorite lion when no query is provided", async () => {
    const lion = buildLion();
    const { store } = createStore({
      lions: [lion],
      favorites: [buildFavorite(lion)]
    });

    await expect(
      showcaseOwnedLion(store, {
        guildId: "guild_123",
        userId: "user_123",
        displayName: "Mira"
      })
    ).resolves.toMatchObject({
      outcome: "showcase",
      showcase: {
        lion,
        isFavorite: true
      }
    });
  });

  it("returns helpful outcomes for missing showcase inputs", async () => {
    const { store } = createStore({
      lions: [buildLion()]
    });

    await expect(
      showcaseOwnedLion(store, {
        guildId: "guild_123",
        userId: "user_123",
        displayName: "Mira"
      })
    ).resolves.toEqual({
      outcome: "no_favorite",
      showcase: null,
      failedQuery: null
    });
    await expect(
      showcaseOwnedLion(store, {
        guildId: "guild_123",
        userId: "user_123",
        displayName: "Mira",
        query: "missing"
      })
    ).resolves.toEqual({
      outcome: "lion_not_found",
      showcase: null,
      failedQuery: "missing"
    });
  });
});

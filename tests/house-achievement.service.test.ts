import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_HOUSE_BADGES,
  awardHouseBadge,
  awardHouseBadgesForWeeklyRecap,
  listUserHouseBadges,
  syncDefaultHouseBadgeDefinitions,
  type HouseAchievementStore,
  type HouseBadgeCategoryValue,
  type HouseBadgeDefinitionRecord,
  type UserHouseBadgeRecord
} from "../src/features/houses/house-achievement.service.js";
import type {
  HousePointLedgerRecord,
  HouseRecord
} from "../src/features/houses/house.service.js";
import type { WeeklyHouseRecap } from "../src/features/houses/house-recap.service.js";

const now = new Date("2026-05-26T12:00:00.000Z");

const buildDefinition = (
  overrides: Partial<HouseBadgeDefinitionRecord> = {}
): HouseBadgeDefinitionRecord => ({
  id: "definition_123",
  badgeKey: "house-champion",
  title: "House Champion",
  description: "Belonged to the weekly winning House when a recap posted.",
  category: "WEEKLY_RECAP",
  isEnabled: true,
  createdAt: now,
  updatedAt: now,
  ...overrides
});

const buildAward = (
  overrides: Partial<UserHouseBadgeRecord> = {}
): UserHouseBadgeRecord => ({
  id: "award_123",
  guildId: "guild_123",
  userId: "user_123",
  badgeKey: "house-champion",
  houseId: "house_red",
  weekKey: "2026-W22",
  awardedAt: now,
  reason: "Weekly recap.",
  ...overrides
});

const buildHouse = (overrides: Partial<HouseRecord> = {}): HouseRecord => ({
  id: "house_red",
  guildId: "guild_123",
  houseKey: "red-house",
  name: "Red House",
  description: null,
  emoji: null,
  color: null,
  isActive: true,
  createdAt: now,
  updatedAt: now,
  ...overrides
});

const buildLedger = (
  overrides: Partial<HousePointLedgerRecord> = {}
): HousePointLedgerRecord => ({
  id: "ledger_123",
  guildId: "guild_123",
  houseId: "house_red",
  userId: "user_123",
  sourceType: "PRACTICE_ATTENDANCE",
  sourceId: "source_123",
  points: 10,
  reason: "Practice attendance",
  createdAt: now,
  ...overrides
});

const createStore = (input: {
  definitions?: HouseBadgeDefinitionRecord[];
  awards?: UserHouseBadgeRecord[];
  memberships?: Array<{ guildId: string; houseId: string; userId: string }>;
} = {}): HouseAchievementStore & {
  definitions: HouseBadgeDefinitionRecord[];
  awards: UserHouseBadgeRecord[];
} => {
  const definitions = input.definitions ?? [];
  const awards = input.awards ?? [];
  const memberships = input.memberships ?? [];

  return {
    definitions,
    awards,
    houseBadgeDefinition: {
      upsert: vi.fn(async ({ where, create, update }) => {
        const existing = definitions.find(
          (definition) => definition.badgeKey === where.badgeKey
        );

        if (existing) {
          Object.assign(existing, update, {
            updatedAt: now
          });
          return existing;
        }

        const created = buildDefinition({
          ...create,
          id: `definition_${definitions.length + 1}`,
          category: create.category as HouseBadgeCategoryValue
        });
        definitions.push(created);
        return created;
      }),
      findUnique: vi.fn(
        async ({ where }) =>
          definitions.find(
            (definition) => definition.badgeKey === where.badgeKey
          ) ?? null
      ),
      findMany: vi.fn(async ({ where } = {}) =>
        definitions
          .filter(
            (definition) =>
              where?.isEnabled === undefined ||
              definition.isEnabled === where.isEnabled
          )
          .sort((first, second) => first.badgeKey.localeCompare(second.badgeKey))
      )
    },
    userHouseBadge: {
      findFirst: vi.fn(
        async ({ where }) =>
          awards.find(
            (award) =>
              award.guildId === where.guildId &&
              award.userId === where.userId &&
              award.badgeKey === where.badgeKey &&
              award.weekKey === (where.weekKey ?? null)
          ) ?? null
      ),
      findMany: vi.fn(async ({ where, take }) =>
        awards
          .filter(
            (award) =>
              award.guildId === where.guildId &&
              (where.userId === undefined || award.userId === where.userId) &&
              (where.houseId === undefined || award.houseId === where.houseId) &&
              (where.weekKey === undefined || award.weekKey === where.weekKey)
          )
          .sort(
            (first, second) =>
              second.awardedAt.getTime() - first.awardedAt.getTime()
          )
          .slice(0, take)
      ),
      create: vi.fn(async ({ data }) => {
        const award = buildAward({
          ...data,
          id: `award_${awards.length + 1}`,
          houseId: data.houseId ?? null,
          weekKey: data.weekKey ?? null,
          reason: data.reason ?? null
        });
        awards.push(award);
        return award;
      })
    },
    houseMembership: {
      findMany: vi.fn(async ({ where }) =>
        memberships.filter(
          (membership) =>
            membership.guildId === where.guildId &&
            (where.houseId === undefined || membership.houseId === where.houseId)
        )
      )
    }
  };
};

const buildRecap = (
  overrides: Partial<WeeklyHouseRecap> = {}
): WeeklyHouseRecap => {
  const redHouse = buildHouse();
  const goldHouse = buildHouse({
    id: "house_gold",
    houseKey: "gold-house",
    name: "Gold House"
  });
  const ledgers = [
    buildLedger({
      userId: "user_1",
      points: 10,
      sourceType: "PRACTICE_ATTENDANCE"
    }),
    buildLedger({
      id: "ledger_2",
      userId: "user_2",
      points: 1,
      sourceType: "RED_ENVELOPE_CLAIM"
    }),
    buildLedger({
      id: "ledger_3",
      userId: "user_3",
      points: 1,
      sourceType: "LION_CATCH"
    }),
    buildLedger({
      id: "ledger_4",
      userId: "user_4",
      points: 2,
      sourceType: "DUEL_COMPLETION",
      houseId: goldHouse.id
    })
  ];

  return {
    guildId: "guild_123",
    weekKey: "2026-W22",
    range: {
      start: new Date("2026-05-25T00:00:00.000Z"),
      end: new Date("2026-06-01T00:00:00.000Z")
    },
    houses: [redHouse, goldHouse],
    ledgerEntries: ledgers,
    standings: [
      {
        rank: 1,
        house: redHouse,
        points: 12
      },
      {
        rank: 2,
        house: goldHouse,
        points: 2
      }
    ],
    topContributors: [],
    sourceBreakdown: [],
    categoryWinners: [],
    hasHouses: true,
    hasPoints: true,
    ...overrides
  };
};

describe("house achievement service", () => {
  it("syncs default House badge definitions idempotently", async () => {
    const store = createStore();

    await syncDefaultHouseBadgeDefinitions(store);
    await syncDefaultHouseBadgeDefinitions(store);

    expect(store.definitions).toHaveLength(DEFAULT_HOUSE_BADGES.length);
    expect(
      new Set(store.definitions.map((definition) => definition.badgeKey)).size
    ).toBe(DEFAULT_HOUSE_BADGES.length);
    expect(store.houseBadgeDefinition.upsert).toHaveBeenCalledTimes(
      DEFAULT_HOUSE_BADGES.length * 2
    );
  });

  it("awards lifetime and weekly badges idempotently", async () => {
    const store = createStore({
      definitions: [buildDefinition()]
    });

    const lifetime = await awardHouseBadge(store, {
      guildId: "guild_123",
      userId: "user_123",
      badgeKey: "house-champion",
      awardedAt: now
    });
    const duplicateLifetime = await awardHouseBadge(store, {
      guildId: "guild_123",
      userId: "user_123",
      badgeKey: "house-champion",
      awardedAt: now
    });
    const weekly = await awardHouseBadge(store, {
      guildId: "guild_123",
      userId: "user_123",
      badgeKey: "house-champion",
      weekKey: "2026-W22",
      awardedAt: now
    });
    const duplicateWeekly = await awardHouseBadge(store, {
      guildId: "guild_123",
      userId: "user_123",
      badgeKey: "house-champion",
      weekKey: "2026-W22",
      awardedAt: now
    });
    const nextWeek = await awardHouseBadge(store, {
      guildId: "guild_123",
      userId: "user_123",
      badgeKey: "house-champion",
      weekKey: "2026-W23",
      awardedAt: now
    });

    expect(lifetime.outcome).toBe("awarded");
    expect(duplicateLifetime.outcome).toBe("already_awarded");
    expect(weekly.outcome).toBe("awarded");
    expect(duplicateWeekly.outcome).toBe("already_awarded");
    expect(nextWeek.outcome).toBe("awarded");
    expect(store.awards).toHaveLength(3);
  });

  it("does not award disabled or missing badge definitions", async () => {
    const store = createStore({
      definitions: [
        buildDefinition({
          isEnabled: false
        })
      ]
    });

    await expect(
      awardHouseBadge(store, {
        guildId: "guild_123",
        userId: "user_123",
        badgeKey: "house-champion",
        awardedAt: now
      })
    ).resolves.toMatchObject({
      outcome: "definition_disabled",
      award: null
    });
    await expect(
      awardHouseBadge(store, {
        guildId: "guild_123",
        userId: "user_123",
        badgeKey: "unknown",
        awardedAt: now
      })
    ).resolves.toMatchObject({
      outcome: "definition_missing",
      award: null
    });
    expect(store.awards).toHaveLength(0);
  });

  it("lists user awards with enabled definition metadata", async () => {
    const store = createStore({
      definitions: [
        buildDefinition(),
        buildDefinition({
          id: "disabled",
          badgeKey: "disabled",
          isEnabled: false
        })
      ],
      awards: [
        buildAward(),
        buildAward({
          id: "award_disabled",
          badgeKey: "disabled"
        })
      ]
    });

    const badges = await listUserHouseBadges(store, {
      guildId: "guild_123",
      userId: "user_123"
    });

    expect(badges).toHaveLength(2);
    expect(badges[0]?.definition?.title).toBe("House Champion");
    expect(badges[1]?.definition).toBeNull();
  });

  it("awards weekly recap badges to winning House members and point contributors", async () => {
    const store = createStore({
      memberships: [
        {
          guildId: "guild_123",
          houseId: "house_red",
          userId: "user_1"
        },
        {
          guildId: "guild_123",
          houseId: "house_red",
          userId: "user_5"
        }
      ]
    });

    const summary = await awardHouseBadgesForWeeklyRecap(store, {
      recap: buildRecap(),
      awardedAt: now
    });
    const duplicate = await awardHouseBadgesForWeeklyRecap(store, {
      recap: buildRecap(),
      awardedAt: now
    });

    expect(summary.awarded).toBe(10);
    expect(duplicate.awarded).toBe(0);
    expect(duplicate.alreadyAwarded).toBe(10);
    expect(
      store.awards.map((award) => [award.userId, award.badgeKey]).sort()
    ).toEqual([
      ["user_1", "house-champion"],
      ["user_1", "practice-powerhouse"],
      ["user_1", "weekly-contributor"],
      ["user_2", "red-envelope-raider"],
      ["user_2", "weekly-contributor"],
      ["user_3", "lion-handler"],
      ["user_3", "weekly-contributor"],
      ["user_4", "duel-defender"],
      ["user_4", "weekly-contributor"],
      ["user_5", "house-champion"]
    ]);
  });

  it("does not award recap badges when no Houses or positive points exist", async () => {
    const store = createStore({
      memberships: [
        {
          guildId: "guild_123",
          houseId: "house_red",
          userId: "user_1"
        }
      ]
    });

    const summary = await awardHouseBadgesForWeeklyRecap(store, {
      recap: buildRecap({
        ledgerEntries: [
          buildLedger({
            points: -1
          })
        ],
        standings: [
          {
            rank: 1,
            house: buildHouse(),
            points: 0
          }
        ],
        hasPoints: false
      }),
      awardedAt: now
    });

    expect(summary.awarded).toBe(0);
    expect(store.awards).toHaveLength(0);
  });
});

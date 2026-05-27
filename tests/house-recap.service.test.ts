import { describe, expect, it } from "vitest";

import {
  buildWeeklyHouseRecap,
  configureHouseRecap,
  getCurrentHouseRecapWeekKey,
  getHouseRecapRangeForWeek,
  getHouseRecapStatus,
  identifyCategoryWinners,
  recordHouseRecapPost,
  shouldSkipAlreadyPostedWeek,
  type HouseRecapConfigRecord,
  type HouseRecapPostRecord,
  type HouseRecapStore
} from "../src/features/houses/house-recap.service.js";
import type {
  HousePointLedgerRecord,
  HouseRecord
} from "../src/features/houses/house.service.js";

const now = new Date("2026-05-26T12:00:00.000Z");

const buildHouse = (overrides: Partial<HouseRecord> = {}): HouseRecord => ({
  id: "house_red",
  guildId: "guild_123",
  houseKey: "red-house",
  name: "Red House",
  description: null,
  emoji: "R",
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
  createdAt: new Date("2026-05-26T12:00:00.000Z"),
  ...overrides
});

const buildConfig = (
  overrides: Partial<HouseRecapConfigRecord> = {}
): HouseRecapConfigRecord => ({
  id: "config_123",
  guildId: "guild_123",
  channelId: "channel_123",
  isEnabled: true,
  weekday: 0,
  hour: 18,
  minute: 0,
  timezone: "America/Chicago",
  createdAt: now,
  updatedAt: now,
  ...overrides
});

const createStore = (input: {
  houses?: HouseRecord[];
  ledgers?: HousePointLedgerRecord[];
  configs?: HouseRecapConfigRecord[];
  posts?: HouseRecapPostRecord[];
}): HouseRecapStore & {
  configs: HouseRecapConfigRecord[];
  posts: HouseRecapPostRecord[];
} => {
  const houses = input.houses ?? [];
  const ledgers = input.ledgers ?? [];
  const configs = input.configs ?? [];
  const posts = input.posts ?? [];

  return {
    configs,
    posts,
    house: {
      findMany: async ({ where }) =>
        houses.filter(
          (house) =>
            house.guildId === where.guildId &&
            (where.isActive === undefined || house.isActive === where.isActive)
        )
    },
    housePointLedger: {
      findMany: async ({ where }) =>
        ledgers.filter(
          (ledger) =>
            ledger.guildId === where.guildId &&
            ledger.createdAt.getTime() >= where.createdAt.gte.getTime() &&
            ledger.createdAt.getTime() < where.createdAt.lt.getTime()
        )
    },
    houseRecapConfig: {
      findUnique: async ({ where }) =>
        configs.find((config) => config.guildId === where.guildId) ?? null,
      findMany: async ({ where }) =>
        configs.filter(
          (config) =>
            where.isEnabled === undefined ||
            config.isEnabled === where.isEnabled
        ),
      upsert: async ({ where, create, update }) => {
        const existingIndex = configs.findIndex(
          (config) => config.guildId === where.guildId
        );

        if (existingIndex >= 0) {
          const updated = {
            ...configs[existingIndex]!,
            ...update,
            updatedAt: now
          };
          configs[existingIndex] = updated;
          return updated;
        }

        const config = buildConfig({
          ...create,
          id: `config_${configs.length + 1}`,
          createdAt: now,
          updatedAt: now
        });
        configs.push(config);
        return config;
      },
      update: async ({ where, data }) => {
        const config = configs.find((entry) => entry.guildId === where.guildId);

        if (!config) {
          throw new Error("config not found");
        }

        Object.assign(config, data, {
          updatedAt: now
        });
        return config;
      }
    },
    houseRecapPost: {
      findUnique: async ({ where }) =>
        posts.find(
          (post) =>
            post.guildId === where.guildId_weekKey.guildId &&
            post.weekKey === where.guildId_weekKey.weekKey
        ) ?? null,
      findMany: async ({ where, take }) =>
        posts
          .filter((post) => post.guildId === where.guildId)
          .sort(
            (first, second) =>
              second.postedAt.getTime() - first.postedAt.getTime()
          )
          .slice(0, take),
      create: async ({ data }) => {
        const post = {
          id: `post_${posts.length + 1}`,
          ...data,
          messageId: data.messageId ?? null
        };
        posts.push(post);
        return post;
      }
    }
  };
};

describe("house recap service", () => {
  it("generates deterministic week keys and ranges", () => {
    expect(
      getCurrentHouseRecapWeekKey(new Date("2026-05-25T12:00:00.000Z"))
    ).toBe("2026-W22");
    expect(
      getCurrentHouseRecapWeekKey(new Date("2026-05-31T23:00:00.000Z"))
    ).toBe("2026-W22");
    expect(
      getCurrentHouseRecapWeekKey(new Date("2026-06-01T12:00:00.000Z"))
    ).toBe("2026-W23");

    expect(getHouseRecapRangeForWeek("2026-W22")).toEqual({
      start: new Date("2026-05-25T00:00:00.000Z"),
      end: new Date("2026-06-01T00:00:00.000Z")
    });
  });

  it("aggregates standings, contributors, source breakdowns, and category winners", async () => {
    const redHouse = buildHouse();
    const goldHouse = buildHouse({
      id: "house_gold",
      houseKey: "gold-house",
      name: "Gold House",
      emoji: "G"
    });
    const store = createStore({
      houses: [redHouse, goldHouse],
      ledgers: [
        buildLedger({
          houseId: redHouse.id,
          userId: "user_1",
          sourceType: "PRACTICE_ATTENDANCE",
          points: 10
        }),
        buildLedger({
          id: "ledger_2",
          houseId: redHouse.id,
          userId: "user_1",
          sourceType: "LION_CATCH",
          points: 1
        }),
        buildLedger({
          id: "ledger_3",
          houseId: goldHouse.id,
          userId: "user_2",
          sourceType: "TRAINING_BATTLE",
          points: 2
        }),
        buildLedger({
          id: "ledger_4",
          houseId: goldHouse.id,
          userId: null,
          sourceType: "ADMIN_ADJUSTMENT",
          points: -1
        }),
        buildLedger({
          id: "outside",
          houseId: goldHouse.id,
          userId: "user_2",
          sourceType: "PRACTICE_ATTENDANCE",
          points: 10,
          createdAt: new Date("2026-06-02T12:00:00.000Z")
        })
      ]
    });

    const recap = await buildWeeklyHouseRecap(store, {
      guildId: "guild_123",
      weekKey: "2026-W22"
    });

    expect(
      recap.standings.map((entry) => [entry.house.name, entry.points])
    ).toEqual([
      ["Red House", 11],
      ["Gold House", 1]
    ]);
    expect(
      recap.topContributors.map((entry) => [entry.userId, entry.points])
    ).toEqual([
      ["user_1", 11],
      ["user_2", 2]
    ]);
    expect(recap.sourceBreakdown).toEqual(
      expect.arrayContaining([
        {
          sourceType: "PRACTICE_ATTENDANCE",
          points: 10
        },
        {
          sourceType: "ADMIN_ADJUSTMENT",
          points: -1
        }
      ])
    );
    expect(
      identifyCategoryWinners(
        [redHouse, goldHouse],
        [
          buildLedger({
            houseId: redHouse.id,
            sourceType: "RED_ENVELOPE_CLAIM",
            points: 1
          })
        ]
      ).find((winner) => winner.category === "redEnvelope")?.house?.name
    ).toBe("Red House");
    expect(
      recap.categoryWinners.find((winner) => winner.category === "practice")
        ?.house?.name
    ).toBe("Red House");
    expect(
      recap.categoryWinners.find((winner) => winner.category === "battleDuel")
        ?.house?.name
    ).toBe("Gold House");
  });

  it("returns friendly empty recap data when no Houses or points exist", async () => {
    const emptyRecap = await buildWeeklyHouseRecap(createStore({}), {
      guildId: "guild_123",
      weekKey: "2026-W22"
    });
    const noPointRecap = await buildWeeklyHouseRecap(
      createStore({
        houses: [buildHouse()]
      }),
      {
        guildId: "guild_123",
        weekKey: "2026-W22"
      }
    );

    expect(emptyRecap.hasHouses).toBe(false);
    expect(emptyRecap.hasPoints).toBe(false);
    expect(noPointRecap.hasHouses).toBe(true);
    expect(noPointRecap.hasPoints).toBe(false);
    expect(noPointRecap.standings[0]?.points).toBe(0);
  });

  it("configures status and prevents duplicate recap posts", async () => {
    const store = createStore({});
    const config = await configureHouseRecap(store, {
      guildId: "guild_123",
      channelId: "channel_123",
      weekday: 7,
      hour: 99,
      minute: -1,
      timezone: "Invalid/Zone"
    });

    expect(config).toMatchObject({
      isEnabled: true,
      weekday: 0,
      hour: 18,
      minute: 0,
      timezone: "America/Chicago"
    });

    const post = await recordHouseRecapPost(store, {
      guildId: "guild_123",
      weekKey: "2026-W22",
      channelId: "channel_123",
      messageId: "message_123",
      postedAt: now
    });

    await expect(
      shouldSkipAlreadyPostedWeek(store, {
        guildId: "guild_123",
        weekKey: "2026-W22"
      })
    ).resolves.toEqual(post);
    await expect(
      getHouseRecapStatus(store, {
        guildId: "guild_123",
        now
      })
    ).resolves.toMatchObject({
      weekKey: "2026-W22",
      alreadyPosted: true,
      currentWeekPost: post,
      lastPost: post
    });
  });
});

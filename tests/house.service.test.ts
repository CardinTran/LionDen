import { describe, expect, it } from "vitest";

import {
  addHousePoints,
  assignUserToHouse,
  createHouse,
  deactivateHouse,
  joinHouse,
  leaveHouse,
  listActiveHouses,
  listHouseLeaderboard,
  normalizeHouseKey,
  recordHousePointsForUser,
  removeHousePoints,
  removeUserFromHouse,
  renameHouse,
  type HouseMembershipRecord,
  type HousePointLedgerRecord,
  type HouseRecord,
  type HouseStore
} from "../src/features/houses/house.service.js";
import {
  formatHouseLeaderboardMessage,
  formatHouseProfileMessage
} from "../src/features/houses/house-formatting.js";

const now = new Date("2026-05-26T12:00:00.000Z");

const createId = (prefix: string, index: number): string =>
  `${prefix}_${index}`;

const buildHouse = (overrides: Partial<HouseRecord> = {}): HouseRecord => ({
  id: "house_123",
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

const buildMembership = (
  overrides: Partial<HouseMembershipRecord> = {}
): HouseMembershipRecord => ({
  id: "membership_123",
  guildId: "guild_123",
  houseId: "house_123",
  userId: "user_123",
  joinedAt: now,
  updatedAt: now,
  ...overrides
});

const buildLedger = (
  overrides: Partial<HousePointLedgerRecord> = {}
): HousePointLedgerRecord => ({
  id: "ledger_123",
  guildId: "guild_123",
  houseId: "house_123",
  userId: "user_123",
  sourceType: "ADMIN_ADJUSTMENT",
  sourceId: null,
  points: 10,
  reason: "Manual adjustment",
  createdAt: now,
  ...overrides
});

const createHouseStore = () => {
  const houses: HouseRecord[] = [];
  const memberships: HouseMembershipRecord[] = [];
  const ledgers: HousePointLedgerRecord[] = [];

  const store: HouseStore = {
    house: {
      create: async ({ data }) => {
        const house = buildHouse({
          ...data,
          id: createId("house", houses.length + 1),
          description: data.description ?? null,
          emoji: data.emoji ?? null,
          color: data.color ?? null,
          isActive: data.isActive ?? true
        });
        houses.push(house);
        return house;
      },
      findUnique: async ({ where }) => {
        if ("id" in where) {
          return houses.find((house) => house.id === where.id) ?? null;
        }

        return (
          houses.find(
            (house) =>
              house.guildId === where.guildId_houseKey.guildId &&
              house.houseKey === where.guildId_houseKey.houseKey
          ) ?? null
        );
      },
      findMany: async ({ where, orderBy }) => {
        let result = houses.filter((house) => house.guildId === where.guildId);

        if (where.isActive !== undefined) {
          result = result.filter((house) => house.isActive === where.isActive);
        }

        if (orderBy?.some((entry) => entry.houseKey === "asc")) {
          result.sort((first, second) =>
            first.houseKey.localeCompare(second.houseKey)
          );
        }

        return result;
      },
      update: async ({ where, data }) => {
        const house = houses.find((entry) => entry.id === where.id);

        if (!house) {
          throw new Error(`Missing house ${where.id}`);
        }

        Object.assign(house, data, {
          updatedAt: now
        });
        return house;
      },
      count: async ({ where }) =>
        houses.filter(
          (house) =>
            house.guildId === where.guildId &&
            (where.isActive === undefined || house.isActive === where.isActive)
        ).length
    },
    houseMembership: {
      findUnique: async ({ where }) =>
        memberships.find(
          (membership) =>
            membership.guildId === where.guildId_userId.guildId &&
            membership.userId === where.guildId_userId.userId
        ) ?? null,
      findMany: async ({ where }) =>
        memberships.filter(
          (membership) =>
            membership.guildId === where.guildId &&
            (!where.houseId || membership.houseId === where.houseId)
        ),
      create: async ({ data }) => {
        const membership = buildMembership({
          ...data,
          id: createId("membership", memberships.length + 1)
        });
        memberships.push(membership);
        return membership;
      },
      update: async ({ where, data }) => {
        const membership = memberships.find(
          (entry) =>
            entry.guildId === where.guildId_userId.guildId &&
            entry.userId === where.guildId_userId.userId
        );

        if (!membership) {
          throw new Error("Missing membership");
        }

        Object.assign(membership, data, {
          updatedAt: now
        });
        return membership;
      },
      delete: async ({ where }) => {
        const index = memberships.findIndex(
          (entry) =>
            entry.guildId === where.guildId_userId.guildId &&
            entry.userId === where.guildId_userId.userId
        );

        if (index === -1) {
          throw new Error("Missing membership");
        }

        return memberships.splice(index, 1)[0]!;
      }
    },
    housePointLedger: {
      create: async ({ data }) => {
        const ledger = buildLedger({
          ...data,
          id: createId("ledger", ledgers.length + 1),
          userId: data.userId ?? null,
          sourceId: data.sourceId ?? null
        });
        ledgers.push(ledger);
        return ledger;
      },
      findUnique: async ({ where }) =>
        ledgers.find(
          (ledger) =>
            ledger.guildId === where.guildId_sourceType_sourceId.guildId &&
            ledger.sourceType ===
              where.guildId_sourceType_sourceId.sourceType &&
            ledger.sourceId === where.guildId_sourceType_sourceId.sourceId
        ) ?? null,
      findMany: async ({ where }) =>
        ledgers.filter(
          (ledger) =>
            ledger.guildId === where.guildId &&
            (!where.houseId || ledger.houseId === where.houseId) &&
            (!where.userId || ledger.userId === where.userId) &&
            (!where.createdAt?.gte ||
              ledger.createdAt.getTime() >= where.createdAt.gte.getTime())
        )
    }
  };

  return {
    store,
    houses,
    memberships,
    ledgers
  };
};

const createTwoHouses = async (
  store: ReturnType<typeof createHouseStore>["store"]
) => {
  const red = await createHouse(store, {
    guildId: "guild_123",
    houseKey: "Red House",
    name: "Red House",
    emoji: null
  });
  const gold = await createHouse(store, {
    guildId: "guild_123",
    houseKey: "gold-house",
    name: "Gold House",
    emoji: null
  });

  return {
    red: red.house!,
    gold: gold.house!
  };
};

describe("house service", () => {
  it("normalizes House keys", () => {
    expect(normalizeHouseKey("  Red House!! ")).toBe("red-house");
    expect(normalizeHouseKey("###")).toBe("");
  });

  it("creates Houses and rejects duplicate keys in the same guild", async () => {
    const { store } = createHouseStore();

    const created = await createHouse(store, {
      guildId: "guild_123",
      houseKey: "Red House",
      name: "Red House"
    });
    const duplicate = await createHouse(store, {
      guildId: "guild_123",
      houseKey: "red-house",
      name: "Red Again"
    });
    const otherGuild = await createHouse(store, {
      guildId: "guild_456",
      houseKey: "red-house",
      name: "Red House"
    });

    expect(created.outcome).toBe("created");
    expect(created.house?.houseKey).toBe("red-house");
    expect(duplicate.outcome).toBe("duplicate_key");
    expect(otherGuild.outcome).toBe("created");
  });

  it("lists active Houses only", async () => {
    const { store } = createHouseStore();
    const { red, gold } = await createTwoHouses(store);

    await deactivateHouse(store, {
      guildId: "guild_123",
      houseKey: gold.houseKey
    });

    await createHouse(store, {
      guildId: "guild_456",
      houseKey: "red-house",
      name: "Other Red"
    });

    expect(await listActiveHouses(store, "guild_123")).toEqual([red]);
  });

  it("lets members join and leave an active House", async () => {
    const { store, memberships } = createHouseStore();
    const { red } = await createTwoHouses(store);

    const joined = await joinHouse(store, {
      guildId: "guild_123",
      userId: "user_123",
      houseKey: red.houseKey
    });
    const left = await leaveHouse(store, {
      guildId: "guild_123",
      userId: "user_123"
    });
    const leftAgain = await leaveHouse(store, {
      guildId: "guild_123",
      userId: "user_123"
    });

    expect(joined.outcome).toBe("joined");
    expect(left.outcome).toBe("left");
    expect(leftAgain.outcome).toBe("not_member");
    expect(memberships).toHaveLength(0);
  });

  it("rejects joining inactive or different Houses without leaving first", async () => {
    const { store } = createHouseStore();
    const { red, gold } = await createTwoHouses(store);

    await joinHouse(store, {
      guildId: "guild_123",
      userId: "user_123",
      houseKey: red.houseKey
    });
    const otherHouse = await joinHouse(store, {
      guildId: "guild_123",
      userId: "user_123",
      houseKey: gold.houseKey
    });
    await deactivateHouse(store, {
      guildId: "guild_123",
      houseKey: gold.houseKey
    });
    const inactive = await joinHouse(store, {
      guildId: "guild_123",
      userId: "user_456",
      houseKey: gold.houseKey
    });

    expect(otherHouse.outcome).toBe("member_of_other_house");
    expect(inactive.outcome).toBe("house_inactive");
  });

  it("lets admin assignment replace existing membership", async () => {
    const { store, memberships } = createHouseStore();
    const { red, gold } = await createTwoHouses(store);

    await joinHouse(store, {
      guildId: "guild_123",
      userId: "user_123",
      houseKey: red.houseKey
    });
    const result = await assignUserToHouse(store, {
      guildId: "guild_123",
      userId: "user_123",
      houseKey: gold.houseKey
    });

    expect(result.outcome).toBe("assigned");
    expect(result.previousHouse?.houseKey).toBe("red-house");
    expect(memberships).toHaveLength(1);
    expect(memberships[0]?.houseId).toBe(gold.id);
  });

  it("lets admin remove members, rename Houses, and deactivate Houses", async () => {
    const { store } = createHouseStore();
    const { red } = await createTwoHouses(store);

    await assignUserToHouse(store, {
      guildId: "guild_123",
      userId: "user_123",
      houseKey: red.houseKey
    });

    const renamed = await renameHouse(store, {
      guildId: "guild_123",
      houseKey: red.houseKey,
      name: "Crimson House"
    });
    const removed = await removeUserFromHouse(store, {
      guildId: "guild_123",
      userId: "user_123"
    });
    const deactivated = await deactivateHouse(store, {
      guildId: "guild_123",
      houseKey: red.houseKey
    });

    expect(renamed).toMatchObject({
      outcome: "updated",
      house: {
        name: "Crimson House"
      }
    });
    expect(removed.outcome).toBe("removed");
    expect(deactivated.house?.isActive).toBe(false);
  });

  it("records positive and negative ledger entries and sorts leaderboard totals", async () => {
    const { store } = createHouseStore();
    const { red, gold } = await createTwoHouses(store);

    await addHousePoints(store, {
      guildId: "guild_123",
      houseId: red.id,
      userId: "user_123",
      sourceType: "ADMIN_ADJUSTMENT",
      points: 10,
      reason: "Manual add"
    });
    await removeHousePoints(store, {
      guildId: "guild_123",
      houseId: red.id,
      points: 15,
      reason: "Manual correction"
    });
    await addHousePoints(store, {
      guildId: "guild_123",
      houseId: gold.id,
      sourceType: "ADMIN_ADJUSTMENT",
      points: 20,
      reason: "Manual add"
    });

    expect(await listHouseLeaderboard(store, { guildId: "guild_123" })).toEqual(
      [
        {
          house: gold,
          points: 20
        },
        {
          house: red,
          points: -5
        }
      ]
    );
  });

  it("records user hook points only for active House members", async () => {
    const { store, ledgers } = createHouseStore();
    const { red } = await createTwoHouses(store);

    const noMembership = await recordHousePointsForUser(store, {
      guildId: "guild_123",
      userId: "user_123",
      sourceType: "PRACTICE_ATTENDANCE",
      sourceId: "session_123:user_123",
      points: 10,
      reason: "Practice attendance"
    });
    await joinHouse(store, {
      guildId: "guild_123",
      userId: "user_123",
      houseKey: red.houseKey
    });
    const recorded = await recordHousePointsForUser(store, {
      guildId: "guild_123",
      userId: "user_123",
      sourceType: "PRACTICE_ATTENDANCE",
      sourceId: "session_123:user_123",
      points: 10,
      reason: "Practice attendance"
    });

    expect(noMembership.outcome).toBe("not_member");
    expect(recorded.outcome).toBe("recorded");
    expect(ledgers).toHaveLength(1);
  });

  it("prevents duplicate hook-based awards but allows repeated admin adjustments", async () => {
    const { store, ledgers } = createHouseStore();
    const { red } = await createTwoHouses(store);

    await joinHouse(store, {
      guildId: "guild_123",
      userId: "user_123",
      houseKey: red.houseKey
    });
    await recordHousePointsForUser(store, {
      guildId: "guild_123",
      userId: "user_123",
      sourceType: "WEEKLY_CHALLENGE",
      sourceId: "2026-W22:practice-presence:user_123",
      points: 5,
      reason: "Weekly challenge"
    });
    const duplicate = await recordHousePointsForUser(store, {
      guildId: "guild_123",
      userId: "user_123",
      sourceType: "WEEKLY_CHALLENGE",
      sourceId: "2026-W22:practice-presence:user_123",
      points: 5,
      reason: "Weekly challenge"
    });
    await addHousePoints(store, {
      guildId: "guild_123",
      houseId: red.id,
      sourceType: "ADMIN_ADJUSTMENT",
      points: 1,
      reason: "Manual add"
    });
    await addHousePoints(store, {
      guildId: "guild_123",
      houseId: red.id,
      sourceType: "ADMIN_ADJUSTMENT",
      points: 1,
      reason: "Manual add"
    });

    expect(duplicate.outcome).toBe("duplicate_source");
    expect(ledgers).toHaveLength(3);
  });

  it("formats leaderboard and no-House profile messages", () => {
    expect(formatHouseLeaderboardMessage([])).toBe(
      "No active Houses are configured yet."
    );
    expect(
      formatHouseProfileMessage({
        displayName: "Mira",
        profile: {
          membership: null,
          house: null,
          weekPoints: 0,
          lifetimePoints: 0
        }
      })
    ).toBe("Mira is not in a House yet.");
  });
});

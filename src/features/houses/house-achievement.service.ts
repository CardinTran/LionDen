import { logger } from "../../lib/logger.js";
import type {
  HousePointSourceTypeValue,
  HouseRecord
} from "./house.service.js";
import type {
  HouseRecapLedgerRecord,
  WeeklyHouseRecap
} from "./house-recap.service.js";

export type HouseBadgeCategoryValue =
  | "MEMBERSHIP"
  | "WEEKLY_RECAP"
  | "PRACTICE"
  | "RED_ENVELOPE"
  | "LION_ACTIVITY"
  | "BATTLE_DUEL"
  | "CONTRIBUTION";

export interface HouseBadgeDefinitionRecord {
  id: string;
  badgeKey: string;
  title: string;
  description: string;
  category: HouseBadgeCategoryValue;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserHouseBadgeRecord {
  id: string;
  guildId: string;
  userId: string;
  badgeKey: string;
  houseId: string | null;
  weekKey: string | null;
  awardedAt: Date;
  reason: string | null;
}

export interface UserHouseBadgeViewEntry {
  award: UserHouseBadgeRecord;
  definition: HouseBadgeDefinitionRecord | null;
}

export interface HouseBadgeAwardResult {
  outcome: "awarded" | "already_awarded" | "definition_disabled" | "definition_missing";
  award: UserHouseBadgeRecord | null;
  definition: HouseBadgeDefinitionRecord | null;
}

export interface HouseRecapBadgeAwardSummary {
  attempted: number;
  awarded: number;
  alreadyAwarded: number;
  skipped: number;
  awards: HouseBadgeAwardResult[];
}

export interface HouseAchievementStore {
  houseBadgeDefinition: {
    upsert(args: {
      where: {
        badgeKey: string;
      };
      create: {
        badgeKey: string;
        title: string;
        description: string;
        category: HouseBadgeCategoryValue;
        isEnabled: boolean;
      };
      update: {
        title: string;
        description: string;
        category: HouseBadgeCategoryValue;
        isEnabled: boolean;
      };
    }): Promise<HouseBadgeDefinitionRecord>;
    findUnique(args: {
      where: {
        badgeKey: string;
      };
    }): Promise<HouseBadgeDefinitionRecord | null>;
    findMany(args?: {
      where?: {
        isEnabled?: boolean;
      };
      orderBy?: Array<{
        badgeKey?: "asc" | "desc";
        title?: "asc" | "desc";
      }>;
    }): Promise<HouseBadgeDefinitionRecord[]>;
  };
  userHouseBadge: {
    findFirst(args: {
      where: {
        guildId: string;
        userId: string;
        badgeKey: string;
        weekKey?: string | null;
      };
    }): Promise<UserHouseBadgeRecord | null>;
    findMany(args: {
      where: {
        guildId: string;
        userId?: string;
        houseId?: string;
        weekKey?: string;
      };
      orderBy?: Array<{
        awardedAt?: "asc" | "desc";
      }>;
      take?: number;
    }): Promise<UserHouseBadgeRecord[]>;
    create(args: {
      data: {
        guildId: string;
        userId: string;
        badgeKey: string;
        houseId?: string | null;
        weekKey?: string | null;
        awardedAt: Date;
        reason?: string | null;
      };
    }): Promise<UserHouseBadgeRecord>;
  };
  houseMembership: {
    findMany(args: {
      where: {
        guildId: string;
        houseId?: string;
      };
      orderBy?: Array<{
        joinedAt?: "asc" | "desc";
        userId?: "asc" | "desc";
      }>;
    }): Promise<Array<{ guildId: string; houseId: string; userId: string }>>;
  };
}

export const DEFAULT_HOUSE_BADGES: Array<
  Omit<HouseBadgeDefinitionRecord, "id" | "createdAt" | "updatedAt">
> = [
  {
    badgeKey: "house-founder",
    title: "House Founder",
    description:
      "Participated in the first House foundation period or received officer recognition for helping establish Houses.",
    category: "MEMBERSHIP",
    isEnabled: true
  },
  {
    badgeKey: "house-champion",
    title: "House Champion",
    description: "Belonged to the weekly winning House when a recap posted.",
    category: "WEEKLY_RECAP",
    isEnabled: true
  },
  {
    badgeKey: "weekly-contributor",
    title: "Weekly Contributor",
    description: "Earned House points during a weekly recap period.",
    category: "CONTRIBUTION",
    isEnabled: true
  },
  {
    badgeKey: "practice-powerhouse",
    title: "Practice Powerhouse",
    description: "Contributed practice attendance House points during a recap week.",
    category: "PRACTICE",
    isEnabled: true
  },
  {
    badgeKey: "red-envelope-raider",
    title: "Red Envelope Raider",
    description: "Contributed red envelope House points during a recap week.",
    category: "RED_ENVELOPE",
    isEnabled: true
  },
  {
    badgeKey: "lion-handler",
    title: "Lion Handler",
    description: "Contributed lion activity House points during a recap week.",
    category: "LION_ACTIVITY",
    isEnabled: true
  },
  {
    badgeKey: "duel-defender",
    title: "Duel Defender",
    description: "Contributed Training Hall or duel House points during a recap week.",
    category: "BATTLE_DUEL",
    isEnabled: true
  }
];

const CATEGORY_BADGE_SOURCES: Array<{
  badgeKey: string;
  sourceTypes: HousePointSourceTypeValue[];
}> = [
  {
    badgeKey: "practice-powerhouse",
    sourceTypes: ["PRACTICE_ATTENDANCE"]
  },
  {
    badgeKey: "red-envelope-raider",
    sourceTypes: ["RED_ENVELOPE_CLAIM"]
  },
  {
    badgeKey: "lion-handler",
    sourceTypes: ["LION_CATCH", "LION_TRAINING"]
  },
  {
    badgeKey: "duel-defender",
    sourceTypes: ["TRAINING_BATTLE", "DUEL_COMPLETION"]
  }
];

export const syncDefaultHouseBadgeDefinitions = async (
  store: Pick<HouseAchievementStore, "houseBadgeDefinition">
): Promise<HouseBadgeDefinitionRecord[]> => {
  const definitions = await Promise.all(
    DEFAULT_HOUSE_BADGES.map((badge) =>
      store.houseBadgeDefinition.upsert({
        where: {
          badgeKey: badge.badgeKey
        },
        create: badge,
        update: badge
      })
    )
  );

  logger.info("House badge definitions synced", {
    badgeCount: definitions.length
  });

  return definitions;
};

export const listHouseBadgeDefinitions = async (
  store: Pick<HouseAchievementStore, "houseBadgeDefinition">,
  input: {
    enabledOnly?: boolean;
  } = {}
): Promise<HouseBadgeDefinitionRecord[]> =>
  store.houseBadgeDefinition.findMany({
    where:
      input.enabledOnly === undefined
        ? undefined
        : {
            isEnabled: input.enabledOnly
          },
    orderBy: [{ badgeKey: "asc" }]
  });

export const awardHouseBadge = async (
  store: Pick<HouseAchievementStore, "houseBadgeDefinition" | "userHouseBadge">,
  input: {
    guildId: string;
    userId: string;
    badgeKey: string;
    houseId?: string | null;
    weekKey?: string | null;
    awardedAt: Date;
    reason?: string | null;
  }
): Promise<HouseBadgeAwardResult> => {
  const definition = await store.houseBadgeDefinition.findUnique({
    where: {
      badgeKey: input.badgeKey
    }
  });

  if (!definition) {
    return {
      outcome: "definition_missing",
      award: null,
      definition: null
    };
  }

  if (!definition.isEnabled) {
    return {
      outcome: "definition_disabled",
      award: null,
      definition
    };
  }

  const existing = await store.userHouseBadge.findFirst({
    where: {
      guildId: input.guildId,
      userId: input.userId,
      badgeKey: input.badgeKey,
      weekKey: input.weekKey ?? null
    }
  });

  if (existing) {
    return {
      outcome: "already_awarded",
      award: existing,
      definition
    };
  }

  const award = await store.userHouseBadge.create({
    data: {
      guildId: input.guildId,
      userId: input.userId,
      badgeKey: input.badgeKey,
      houseId: input.houseId ?? null,
      weekKey: input.weekKey ?? null,
      awardedAt: input.awardedAt,
      reason: input.reason ?? null
    }
  });

  logger.info("House badge awarded", {
    guildId: input.guildId,
    userId: input.userId,
    houseId: input.houseId,
    badgeKey: input.badgeKey,
    weekKey: input.weekKey
  });

  return {
    outcome: "awarded",
    award,
    definition
  };
};

const getPositiveUserLedgers = (
  ledgers: HouseRecapLedgerRecord[],
  sourceTypes?: HousePointSourceTypeValue[]
): HouseRecapLedgerRecord[] =>
  ledgers.filter(
    (ledger) =>
      ledger.userId &&
      ledger.points > 0 &&
      (!sourceTypes || sourceTypes.includes(ledger.sourceType))
  );

const groupLedgersByUser = (
  ledgers: HouseRecapLedgerRecord[]
): Array<{ userId: string; houseId: string; points: number }> => {
  const byUser = new Map<string, { userId: string; houseId: string; points: number }>();

  for (const ledger of ledgers) {
    if (!ledger.userId) {
      continue;
    }

    const current = byUser.get(ledger.userId) ?? {
      userId: ledger.userId,
      houseId: ledger.houseId,
      points: 0
    };
    current.points += ledger.points;
    byUser.set(ledger.userId, current);
  }

  return [...byUser.values()].filter((entry) => entry.points > 0);
};

const getWinningHouse = (recap: WeeklyHouseRecap): HouseRecord | null => {
  const [winner] = recap.standings;

  if (!winner || winner.points <= 0) {
    return null;
  }

  return winner.house;
};

export const awardHouseBadgesForWeeklyRecap = async (
  store: HouseAchievementStore,
  input: {
    recap: WeeklyHouseRecap;
    awardedAt: Date;
  }
): Promise<HouseRecapBadgeAwardSummary> => {
  await syncDefaultHouseBadgeDefinitions(store);

  const awards: HouseBadgeAwardResult[] = [];
  const awardInputs: Array<{
    userId: string;
    houseId: string | null;
    badgeKey: string;
    reason: string;
  }> = [];
  const winningHouse = getWinningHouse(input.recap);

  if (winningHouse) {
    const winningMembers = await store.houseMembership.findMany({
      where: {
        guildId: input.recap.guildId,
        houseId: winningHouse.id
      },
      orderBy: [{ userId: "asc" }]
    });

    for (const member of winningMembers) {
      awardInputs.push({
        userId: member.userId,
        houseId: winningHouse.id,
        badgeKey: "house-champion",
        reason: `Member of the winning House for ${input.recap.weekKey}.`
      });
    }
  }

  for (const contributor of groupLedgersByUser(
    getPositiveUserLedgers(input.recap.ledgerEntries)
  )) {
    awardInputs.push({
      userId: contributor.userId,
      houseId: contributor.houseId,
      badgeKey: "weekly-contributor",
      reason: `Earned House points during ${input.recap.weekKey}.`
    });
  }

  for (const category of CATEGORY_BADGE_SOURCES) {
    for (const contributor of groupLedgersByUser(
      getPositiveUserLedgers(input.recap.ledgerEntries, category.sourceTypes)
    )) {
      awardInputs.push({
        userId: contributor.userId,
        houseId: contributor.houseId,
        badgeKey: category.badgeKey,
        reason: `Contributed ${category.sourceTypes.join(", ")} House points during ${input.recap.weekKey}.`
      });
    }
  }

  const seen = new Set<string>();

  for (const awardInput of awardInputs) {
    const key = `${awardInput.userId}:${awardInput.badgeKey}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    awards.push(
      await awardHouseBadge(store, {
        guildId: input.recap.guildId,
        userId: awardInput.userId,
        badgeKey: awardInput.badgeKey,
        houseId: awardInput.houseId,
        weekKey: input.recap.weekKey,
        awardedAt: input.awardedAt,
        reason: awardInput.reason
      })
    );
  }

  const summary = {
    attempted: awards.length,
    awarded: awards.filter((award) => award.outcome === "awarded").length,
    alreadyAwarded: awards.filter((award) => award.outcome === "already_awarded")
      .length,
    skipped: awards.filter(
      (award) =>
        award.outcome === "definition_disabled" ||
        award.outcome === "definition_missing"
    ).length,
    awards
  };

  logger.info("Weekly House Recap badge awards processed", {
    guildId: input.recap.guildId,
    weekKey: input.recap.weekKey,
    attempted: summary.attempted,
    awarded: summary.awarded,
    alreadyAwarded: summary.alreadyAwarded,
    skipped: summary.skipped
  });

  return summary;
};

export const listUserHouseBadges = async (
  store: Pick<HouseAchievementStore, "houseBadgeDefinition" | "userHouseBadge">,
  input: {
    guildId: string;
    userId: string;
    take?: number;
  }
): Promise<UserHouseBadgeViewEntry[]> => {
  const [definitions, awards] = await Promise.all([
    listHouseBadgeDefinitions(store, {
      enabledOnly: true
    }),
    store.userHouseBadge.findMany({
      where: {
        guildId: input.guildId,
        userId: input.userId
      },
      orderBy: [{ awardedAt: "desc" }],
      take: input.take
    })
  ]);
  const definitionByBadgeKey = new Map(
    definitions.map((definition) => [definition.badgeKey, definition])
  );

  return awards.map((award) => ({
    award,
    definition: definitionByBadgeKey.get(award.badgeKey) ?? null
  }));
};

export const listHouseBadgeAwardsForHouse = async (
  store: Pick<HouseAchievementStore, "houseBadgeDefinition" | "userHouseBadge">,
  input: {
    guildId: string;
    houseId: string;
    take?: number;
  }
): Promise<UserHouseBadgeViewEntry[]> => {
  const [definitions, awards] = await Promise.all([
    listHouseBadgeDefinitions(store, {
      enabledOnly: true
    }),
    store.userHouseBadge.findMany({
      where: {
        guildId: input.guildId,
        houseId: input.houseId
      },
      orderBy: [{ awardedAt: "desc" }],
      take: input.take
    })
  ]);
  const definitionByBadgeKey = new Map(
    definitions.map((definition) => [definition.badgeKey, definition])
  );

  return awards.map((award) => ({
    award,
    definition: definitionByBadgeKey.get(award.badgeKey) ?? null
  }));
};

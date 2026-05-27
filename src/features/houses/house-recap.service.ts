import { getWeeklyChallengeWeekKey } from "../challenges/weekly-challenge.service.js";
import type {
  HousePointSourceTypeValue,
  HouseRecord
} from "./house.service.js";

export const HOUSE_RECAP_DEFAULT_TIMEZONE = "America/Chicago";
export const HOUSE_RECAP_DEFAULT_WEEKDAY = 0;
export const HOUSE_RECAP_DEFAULT_HOUR = 18;
export const HOUSE_RECAP_DEFAULT_MINUTE = 0;

export interface HouseRecapConfigRecord {
  id: string;
  guildId: string;
  channelId: string | null;
  isEnabled: boolean;
  weekday: number;
  hour: number;
  minute: number;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface HouseRecapPostRecord {
  id: string;
  guildId: string;
  weekKey: string;
  channelId: string;
  messageId: string | null;
  postedAt: Date;
}

export interface HouseRecapLedgerRecord {
  id: string;
  guildId: string;
  houseId: string;
  userId: string | null;
  sourceType: HousePointSourceTypeValue;
  sourceId: string | null;
  points: number;
  reason: string;
  createdAt: Date;
}

export interface HouseRecapStore {
  house: {
    findMany(args: {
      where: {
        guildId: string;
        isActive?: boolean;
      };
      orderBy?: Array<{
        houseKey?: "asc" | "desc";
        name?: "asc" | "desc";
      }>;
    }): Promise<HouseRecord[]>;
  };
  housePointLedger: {
    findMany(args: {
      where: {
        guildId: string;
        createdAt: {
          gte: Date;
          lt: Date;
        };
      };
      orderBy?: Array<{
        createdAt?: "asc" | "desc";
      }>;
    }): Promise<HouseRecapLedgerRecord[]>;
  };
  houseRecapConfig: {
    findUnique(args: {
      where: {
        guildId: string;
      };
    }): Promise<HouseRecapConfigRecord | null>;
    findMany(args: {
      where: {
        isEnabled?: boolean;
      };
      orderBy?: Array<{
        guildId?: "asc" | "desc";
      }>;
    }): Promise<HouseRecapConfigRecord[]>;
    upsert(args: {
      where: {
        guildId: string;
      };
      create: {
        guildId: string;
        channelId: string | null;
        isEnabled: boolean;
        weekday: number;
        hour: number;
        minute: number;
        timezone: string;
      };
      update: {
        channelId?: string | null;
        isEnabled?: boolean;
        weekday?: number;
        hour?: number;
        minute?: number;
        timezone?: string;
      };
    }): Promise<HouseRecapConfigRecord>;
    update(args: {
      where: {
        guildId: string;
      };
      data: {
        isEnabled?: boolean;
      };
    }): Promise<HouseRecapConfigRecord>;
  };
  houseRecapPost: {
    findUnique(args: {
      where: {
        guildId_weekKey: {
          guildId: string;
          weekKey: string;
        };
      };
    }): Promise<HouseRecapPostRecord | null>;
    findMany(args: {
      where: {
        guildId: string;
      };
      orderBy?: Array<{
        postedAt?: "asc" | "desc";
      }>;
      take?: number;
    }): Promise<HouseRecapPostRecord[]>;
    create(args: {
      data: {
        guildId: string;
        weekKey: string;
        channelId: string;
        messageId?: string | null;
        postedAt: Date;
      };
    }): Promise<HouseRecapPostRecord>;
  };
}

export interface HouseRecapRange {
  start: Date;
  end: Date;
}

export interface HouseRecapStanding {
  rank: number;
  house: HouseRecord;
  points: number;
}

export interface HouseRecapContributor {
  rank: number;
  userId: string;
  points: number;
  sourceBreakdown: Partial<Record<HousePointSourceTypeValue, number>>;
}

export interface HouseRecapSourceBreakdown {
  sourceType: HousePointSourceTypeValue;
  points: number;
}

export type HouseRecapCategoryKey =
  | "practice"
  | "weekly"
  | "redEnvelope"
  | "lionActivity"
  | "battleDuel"
  | "adminAdjustment";

export interface HouseRecapCategoryWinner {
  category: HouseRecapCategoryKey;
  label: string;
  house: HouseRecord | null;
  points: number;
}

export interface WeeklyHouseRecap {
  guildId: string;
  weekKey: string;
  range: HouseRecapRange;
  houses: HouseRecord[];
  ledgerEntries: HouseRecapLedgerRecord[];
  standings: HouseRecapStanding[];
  topContributors: HouseRecapContributor[];
  sourceBreakdown: HouseRecapSourceBreakdown[];
  categoryWinners: HouseRecapCategoryWinner[];
  hasHouses: boolean;
  hasPoints: boolean;
}

export interface HouseRecapStatus {
  config: HouseRecapConfigRecord | null;
  weekKey: string;
  alreadyPosted: boolean;
  currentWeekPost: HouseRecapPostRecord | null;
  lastPost: HouseRecapPostRecord | null;
}

const SOURCE_TYPES: HousePointSourceTypeValue[] = [
  "PRACTICE_ATTENDANCE",
  "WEEKLY_CHALLENGE",
  "RED_ENVELOPE_CLAIM",
  "LION_CATCH",
  "LION_TRAINING",
  "TRAINING_BATTLE",
  "DUEL_COMPLETION",
  "MESSAGE_ACTIVITY",
  "ADMIN_ADJUSTMENT"
];

export const HOUSE_RECAP_CATEGORIES: Array<{
  key: HouseRecapCategoryKey;
  label: string;
  sourceTypes: HousePointSourceTypeValue[];
}> = [
  {
    key: "practice",
    label: "Most practice points",
    sourceTypes: ["PRACTICE_ATTENDANCE"]
  },
  {
    key: "weekly",
    label: "Most weekly challenge points",
    sourceTypes: ["WEEKLY_CHALLENGE"]
  },
  {
    key: "redEnvelope",
    label: "Most red envelope points",
    sourceTypes: ["RED_ENVELOPE_CLAIM"]
  },
  {
    key: "lionActivity",
    label: "Most lion activity",
    sourceTypes: ["LION_CATCH", "LION_TRAINING"]
  },
  {
    key: "battleDuel",
    label: "Most battle/duel points",
    sourceTypes: ["TRAINING_BATTLE", "DUEL_COMPLETION"]
  },
  {
    key: "adminAdjustment",
    label: "Admin adjustments",
    sourceTypes: ["ADMIN_ADJUSTMENT"]
  }
];

const getIsoWeekStart = (date: Date): Date => {
  const utcDate = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() - day + 1);
  return utcDate;
};

export const getCurrentHouseRecapWeekKey = (date: Date): string =>
  getWeeklyChallengeWeekKey(date);

export const getHouseRecapRangeForWeek = (weekKey: string): HouseRecapRange => {
  const match = /^(\d{4})-W(\d{2})$/.exec(weekKey);

  if (!match) {
    throw new Error(`Invalid House recap week key: ${weekKey}`);
  }

  const year = Number(match[1]);
  const week = Number(match[2]);
  const januaryFourth = new Date(Date.UTC(year, 0, 4));
  const firstWeekStart = getIsoWeekStart(januaryFourth);
  const start = new Date(firstWeekStart.getTime() + (week - 1) * 604_800_000);
  const end = new Date(start.getTime() + 604_800_000);

  return {
    start,
    end
  };
};

export const getHouseRecapRangeForDate = (date: Date): HouseRecapRange =>
  getHouseRecapRangeForWeek(getCurrentHouseRecapWeekKey(date));

const clampInteger = (
  value: number | null | undefined,
  min: number,
  max: number,
  fallback: number
): number => {
  if (value === null || value === undefined || !Number.isInteger(value)) {
    return fallback;
  }

  if (value < min || value > max) {
    return fallback;
  }

  return value;
};

const normalizeTimezone = (value: string | null | undefined): string => {
  const timezone = value?.trim() || HOUSE_RECAP_DEFAULT_TIMEZONE;

  try {
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone
    }).format(new Date());
    return timezone;
  } catch {
    return HOUSE_RECAP_DEFAULT_TIMEZONE;
  }
};

export const getHouseRecapConfig = async (
  store: HouseRecapStore,
  guildId: string
): Promise<HouseRecapConfigRecord | null> =>
  store.houseRecapConfig.findUnique({
    where: {
      guildId
    }
  });

export const configureHouseRecap = async (
  store: HouseRecapStore,
  input: {
    guildId: string;
    channelId: string;
    weekday?: number | null;
    hour?: number | null;
    minute?: number | null;
    timezone?: string | null;
  }
): Promise<HouseRecapConfigRecord> =>
  store.houseRecapConfig.upsert({
    where: {
      guildId: input.guildId
    },
    create: {
      guildId: input.guildId,
      channelId: input.channelId,
      isEnabled: true,
      weekday: clampInteger(input.weekday, 0, 6, HOUSE_RECAP_DEFAULT_WEEKDAY),
      hour: clampInteger(input.hour, 0, 23, HOUSE_RECAP_DEFAULT_HOUR),
      minute: clampInteger(input.minute, 0, 59, HOUSE_RECAP_DEFAULT_MINUTE),
      timezone: normalizeTimezone(input.timezone)
    },
    update: {
      channelId: input.channelId,
      isEnabled: true,
      weekday: clampInteger(input.weekday, 0, 6, HOUSE_RECAP_DEFAULT_WEEKDAY),
      hour: clampInteger(input.hour, 0, 23, HOUSE_RECAP_DEFAULT_HOUR),
      minute: clampInteger(input.minute, 0, 59, HOUSE_RECAP_DEFAULT_MINUTE),
      timezone: normalizeTimezone(input.timezone)
    }
  });

export const disableHouseRecap = async (
  store: HouseRecapStore,
  guildId: string
): Promise<HouseRecapConfigRecord | null> => {
  const config = await getHouseRecapConfig(store, guildId);

  if (!config) {
    return null;
  }

  return store.houseRecapConfig.update({
    where: {
      guildId
    },
    data: {
      isEnabled: false
    }
  });
};

export const listEnabledHouseRecapConfigs = async (
  store: HouseRecapStore
): Promise<HouseRecapConfigRecord[]> =>
  store.houseRecapConfig.findMany({
    where: {
      isEnabled: true
    },
    orderBy: [{ guildId: "asc" }]
  });

const getPointTotal = (entries: Array<{ points: number }>): number =>
  entries.reduce((total, entry) => total + entry.points, 0);

const rankEntries = <Entry extends { points: number }>(
  entries: Entry[],
  tieBreaker: (first: Entry, second: Entry) => number
): Array<Entry & { rank: number }> =>
  entries
    .sort((first, second) => {
      const pointsDelta = second.points - first.points;
      return pointsDelta !== 0 ? pointsDelta : tieBreaker(first, second);
    })
    .map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));

export const listWeeklyHouseStandings = (
  houses: HouseRecord[],
  ledgers: HouseRecapLedgerRecord[]
): HouseRecapStanding[] =>
  rankEntries(
    houses.map((house) => ({
      house,
      points: getPointTotal(
        ledgers.filter((ledger) => ledger.houseId === house.id)
      )
    })),
    (first, second) =>
      first.house.name.localeCompare(second.house.name) ||
      first.house.houseKey.localeCompare(second.house.houseKey)
  );

export const listWeeklyTopContributors = (
  ledgers: HouseRecapLedgerRecord[],
  limit = 5
): HouseRecapContributor[] => {
  const contributorMap = new Map<
    string,
    {
      userId: string;
      points: number;
      sourceBreakdown: Partial<Record<HousePointSourceTypeValue, number>>;
    }
  >();

  for (const ledger of ledgers) {
    if (!ledger.userId) {
      continue;
    }

    const contributor = contributorMap.get(ledger.userId) ?? {
      userId: ledger.userId,
      points: 0,
      sourceBreakdown: {}
    };
    contributor.points += ledger.points;
    contributor.sourceBreakdown[ledger.sourceType] =
      (contributor.sourceBreakdown[ledger.sourceType] ?? 0) + ledger.points;
    contributorMap.set(ledger.userId, contributor);
  }

  return rankEntries([...contributorMap.values()], (first, second) =>
    first.userId.localeCompare(second.userId)
  ).slice(0, limit);
};

export const summarizeHousePointsBySourceType = (
  ledgers: HouseRecapLedgerRecord[]
): HouseRecapSourceBreakdown[] =>
  SOURCE_TYPES.map((sourceType) => ({
    sourceType,
    points: getPointTotal(
      ledgers.filter((ledger) => ledger.sourceType === sourceType)
    )
  })).filter((entry) => entry.points !== 0);

export const identifyCategoryWinners = (
  houses: HouseRecord[],
  ledgers: HouseRecapLedgerRecord[]
): HouseRecapCategoryWinner[] => {
  const houseById = new Map(houses.map((house) => [house.id, house]));

  return HOUSE_RECAP_CATEGORIES.map((category) => {
    const categoryLedgers = ledgers.filter((ledger) =>
      category.sourceTypes.includes(ledger.sourceType)
    );
    const pointsByHouse = new Map<string, number>();

    for (const ledger of categoryLedgers) {
      pointsByHouse.set(
        ledger.houseId,
        (pointsByHouse.get(ledger.houseId) ?? 0) + ledger.points
      );
    }

    const [winner] = [...pointsByHouse.entries()]
      .filter(([houseId]) => houseById.has(houseId))
      .sort((first, second) => {
        const pointsDelta = second[1] - first[1];

        if (pointsDelta !== 0) {
          return pointsDelta;
        }

        return (houseById.get(first[0])?.name ?? first[0]).localeCompare(
          houseById.get(second[0])?.name ?? second[0]
        );
      });

    return {
      category: category.key,
      label: category.label,
      house:
        winner && winner[1] > 0 ? (houseById.get(winner[0]) ?? null) : null,
      points: winner?.[1] ?? 0
    };
  });
};

export const buildWeeklyHouseRecap = async (
  store: HouseRecapStore,
  input: {
    guildId: string;
    weekKey?: string;
    now?: Date;
  }
): Promise<WeeklyHouseRecap> => {
  const weekKey =
    input.weekKey ?? getCurrentHouseRecapWeekKey(input.now ?? new Date());
  const range = getHouseRecapRangeForWeek(weekKey);
  const [houses, ledgers] = await Promise.all([
    store.house.findMany({
      where: {
        guildId: input.guildId,
        isActive: true
      },
      orderBy: [{ houseKey: "asc" }]
    }),
    store.housePointLedger.findMany({
      where: {
        guildId: input.guildId,
        createdAt: {
          gte: range.start,
          lt: range.end
        }
      },
      orderBy: [{ createdAt: "asc" }]
    })
  ]);
  const houseIds = new Set(houses.map((house) => house.id));
  const scopedLedgers = ledgers.filter((ledger) =>
    houseIds.has(ledger.houseId)
  );

  return {
    guildId: input.guildId,
    weekKey,
    range,
    houses,
    ledgerEntries: scopedLedgers,
    standings: listWeeklyHouseStandings(houses, scopedLedgers),
    topContributors: listWeeklyTopContributors(scopedLedgers),
    sourceBreakdown: summarizeHousePointsBySourceType(scopedLedgers),
    categoryWinners: identifyCategoryWinners(houses, scopedLedgers),
    hasHouses: houses.length > 0,
    hasPoints: scopedLedgers.length > 0
  };
};

export const shouldSkipAlreadyPostedWeek = async (
  store: HouseRecapStore,
  input: {
    guildId: string;
    weekKey: string;
  }
): Promise<HouseRecapPostRecord | null> =>
  store.houseRecapPost.findUnique({
    where: {
      guildId_weekKey: {
        guildId: input.guildId,
        weekKey: input.weekKey
      }
    }
  });

export const recordHouseRecapPost = async (
  store: HouseRecapStore,
  input: {
    guildId: string;
    weekKey: string;
    channelId: string;
    messageId?: string | null;
    postedAt: Date;
  }
): Promise<HouseRecapPostRecord> =>
  store.houseRecapPost.create({
    data: {
      guildId: input.guildId,
      weekKey: input.weekKey,
      channelId: input.channelId,
      messageId: input.messageId ?? null,
      postedAt: input.postedAt
    }
  });

export const getHouseRecapStatus = async (
  store: HouseRecapStore,
  input: {
    guildId: string;
    now: Date;
  }
): Promise<HouseRecapStatus> => {
  const weekKey = getCurrentHouseRecapWeekKey(input.now);
  const [config, currentWeekPost, lastPosts] = await Promise.all([
    getHouseRecapConfig(store, input.guildId),
    shouldSkipAlreadyPostedWeek(store, {
      guildId: input.guildId,
      weekKey
    }),
    store.houseRecapPost.findMany({
      where: {
        guildId: input.guildId
      },
      orderBy: [{ postedAt: "desc" }],
      take: 1
    })
  ]);

  return {
    config,
    weekKey,
    alreadyPosted: Boolean(currentWeekPost),
    currentWeekPost,
    lastPost: lastPosts[0] ?? null
  };
};

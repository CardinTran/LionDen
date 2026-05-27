import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HouseAchievementStore } from "../src/features/houses/house-achievement.service.js";
import type { HouseRecapStore } from "../src/features/houses/house-recap.service.js";
import type { HouseRecord } from "../src/features/houses/house.service.js";

const mockLoggerInfo = vi.fn();
const mockLoggerWarn = vi.fn();
const mockLoggerError = vi.fn();
const mockPrisma = vi.hoisted(
  () => ({}) as HouseRecapStore & HouseAchievementStore
);

vi.mock("../src/lib/prisma.js", () => ({
  prisma: mockPrisma
}));

vi.mock("../src/lib/logger.js", () => ({
  logger: {
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    error: mockLoggerError
  }
}));

const { isHouseRecapDue, postWeeklyHouseRecap, runHouseRecapSchedulerTick } =
  await import("../src/features/houses/house-recap-scheduler.js");

const now = new Date("2026-05-26T12:00:00.000Z");

const house: HouseRecord = {
  id: "house_red",
  guildId: "guild_123",
  houseKey: "red-house",
  name: "Red House",
  description: null,
  emoji: null,
  color: null,
  isActive: true,
  createdAt: now,
  updatedAt: now
};

const createStore = (
  input: { alreadyPosted?: boolean; awardSyncFails?: boolean } = {}
) => {
  const posts: Array<{
    id: string;
    guildId: string;
    weekKey: string;
    channelId: string;
    messageId: string | null;
    postedAt: Date;
  }> = input.alreadyPosted
    ? [
        {
          id: "post_existing",
          guildId: "guild_123",
          weekKey: "2026-W22",
          channelId: "channel_123",
          messageId: "message_existing",
          postedAt: now
        }
      ]
    : [];
  const definitions: Array<{
    id: string;
    badgeKey: string;
    title: string;
    description: string;
    category:
      | "MEMBERSHIP"
      | "WEEKLY_RECAP"
      | "PRACTICE"
      | "RED_ENVELOPE"
      | "LION_ACTIVITY"
      | "BATTLE_DUEL"
      | "CONTRIBUTION";
    isEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
  }> = [];
  const awards: Array<{
    id: string;
    guildId: string;
    userId: string;
    badgeKey: string;
    houseId: string | null;
    weekKey: string | null;
    awardedAt: Date;
    reason: string | null;
  }> = [];

  return {
    posts,
    awards,
    store: {
      house: {
        findMany: vi.fn(async () => [house])
      },
      housePointLedger: {
        findMany: vi.fn(async () => [
          {
            id: "ledger_123",
            guildId: "guild_123",
            houseId: house.id,
            userId: "user_123",
            sourceType: "PRACTICE_ATTENDANCE" as const,
            sourceId: "source_123",
            points: 10,
            reason: "Practice attendance",
            createdAt: now
          }
        ])
      },
      houseRecapConfig: {
        findUnique: vi.fn(),
        findMany: vi.fn(async () => [
          {
            id: "config_123",
            guildId: "guild_123",
            channelId: "channel_123",
            isEnabled: true,
            weekday: 2,
            hour: 7,
            minute: 0,
            timezone: "America/Chicago",
            createdAt: now,
            updatedAt: now
          }
        ]),
        upsert: vi.fn(),
        update: vi.fn()
      },
      houseRecapPost: {
        findUnique: vi.fn(
          async ({ where }) =>
            posts.find(
              (post) =>
                post.guildId === where.guildId_weekKey.guildId &&
                post.weekKey === where.guildId_weekKey.weekKey
            ) ?? null
        ),
        findMany: vi.fn(async () => posts),
        create: vi.fn(async ({ data }) => {
          const post = {
            id: `post_${posts.length + 1}`,
            ...data,
            messageId: data.messageId ?? null
          };
          posts.push(post);
          return post;
        })
      },
      houseBadgeDefinition: {
        upsert: vi.fn(async ({ where, create, update }) => {
          if (input.awardSyncFails) {
            throw new Error("badge sync unavailable");
          }

          const existing = definitions.find(
            (definition) => definition.badgeKey === where.badgeKey
          );

          if (existing) {
            Object.assign(existing, update, {
              updatedAt: now
            });
            return existing;
          }

          const definition = {
            id: `definition_${definitions.length + 1}`,
            ...create,
            createdAt: now,
            updatedAt: now
          };
          definitions.push(definition);
          return definition;
        }),
        findUnique: vi.fn(
          async ({ where }) =>
            definitions.find(
              (definition) => definition.badgeKey === where.badgeKey
            ) ?? null
        ),
        findMany: vi.fn(async ({ where } = {}) =>
          definitions.filter(
            (definition) =>
              where?.isEnabled === undefined ||
              definition.isEnabled === where.isEnabled
          )
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
        findMany: vi.fn(async () => awards),
        create: vi.fn(async ({ data }) => {
          const award = {
            id: `award_${awards.length + 1}`,
            ...data,
            houseId: data.houseId ?? null,
            weekKey: data.weekKey ?? null,
            reason: data.reason ?? null
          };
          awards.push(award);
          return award;
        })
      },
      houseMembership: {
        findMany: vi.fn(async () => [
          {
            guildId: "guild_123",
            houseId: house.id,
            userId: "user_123"
          }
        ])
      }
    } satisfies HouseRecapStore & HouseAchievementStore
  };
};

describe("house recap scheduler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("detects due configs in the configured timezone", () => {
    expect(
      isHouseRecapDue(
        {
          weekday: 2,
          hour: 7,
          minute: 0,
          timezone: "America/Chicago"
        },
        new Date("2026-05-26T12:00:00.000Z")
      )
    ).toBe(true);
  });

  it("posts and records a weekly recap", async () => {
    const { store, posts, awards } = createStore();
    const channel = {
      id: "channel_123",
      send: vi.fn(async () => ({
        id: "message_123"
      }))
    };

    const result = await postWeeklyHouseRecap(store, {
      guildId: "guild_123",
      channel,
      now
    });

    expect(result.outcome).toBe("posted");
    expect(channel.send).toHaveBeenCalledWith({
      content: expect.stringContaining("House Cup Weekly Recap")
    });
    expect(posts).toHaveLength(1);
    expect(awards.map((award) => award.badgeKey)).toEqual(
      expect.arrayContaining([
        "house-champion",
        "weekly-contributor",
        "practice-powerhouse"
      ])
    );
  });

  it("skips an already posted week unless forced", async () => {
    const { store } = createStore({
      alreadyPosted: true
    });
    const channel = {
      id: "channel_123",
      send: vi.fn(async () => ({
        id: "message_123"
      }))
    };

    await expect(
      postWeeklyHouseRecap(store, {
        guildId: "guild_123",
        channel,
        now
      })
    ).resolves.toMatchObject({
      outcome: "skipped_duplicate"
    });
    expect(channel.send).not.toHaveBeenCalled();

    await expect(
      postWeeklyHouseRecap(store, {
        guildId: "guild_123",
        channel,
        now,
        force: true
      })
    ).resolves.toMatchObject({
      outcome: "posted"
    });
    expect(channel.send).toHaveBeenCalledOnce();
  });

  it("logs badge awarding failures without blocking recap posting", async () => {
    const { store, posts } = createStore({
      awardSyncFails: true
    });
    const channel = {
      id: "channel_123",
      send: vi.fn(async () => ({
        id: "message_123"
      }))
    };

    await expect(
      postWeeklyHouseRecap(store, {
        guildId: "guild_123",
        channel,
        now
      })
    ).resolves.toMatchObject({
      outcome: "posted"
    });
    expect(posts).toHaveLength(1);
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      "Weekly House Recap badge awarding failed",
      expect.objectContaining({
        guildId: "guild_123",
        weekKey: "2026-W22"
      })
    );
  });

  it("runs due scheduler configs and logs per-guild failures without blocking others", async () => {
    const { store } = createStore();
    Object.assign(mockPrisma, store);
    store.houseRecapConfig.findMany = vi.fn(async () => [
      {
        id: "config_123",
        guildId: "guild_123",
        channelId: "channel_123",
        isEnabled: true,
        weekday: 2,
        hour: 7,
        minute: 0,
        timezone: "America/Chicago",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "config_456",
        guildId: "guild_456",
        channelId: "missing_channel",
        isEnabled: true,
        weekday: 2,
        hour: 7,
        minute: 0,
        timezone: "America/Chicago",
        createdAt: now,
        updatedAt: now
      }
    ]);
    const send = vi.fn(async () => ({
      id: "message_123"
    }));
    const fetch = vi.fn(async (channelId: string) =>
      channelId === "missing_channel"
        ? null
        : {
            id: channelId,
            isTextBased: () => true,
            send
          }
    );

    await runHouseRecapSchedulerTick(
      {
        channels: {
          fetch
        }
      } as never,
      now
    );

    expect(send).toHaveBeenCalledOnce();
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      "Weekly House Recap channel unavailable",
      {
        guildId: "guild_456",
        channelId: "missing_channel"
      }
    );
  });
});

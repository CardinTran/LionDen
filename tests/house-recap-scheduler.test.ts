import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HouseRecapStore } from "../src/features/houses/house-recap.service.js";
import type { HouseRecord } from "../src/features/houses/house.service.js";

const mockLoggerInfo = vi.fn();
const mockLoggerWarn = vi.fn();
const mockLoggerError = vi.fn();
const mockPrisma = vi.hoisted(() => ({}) as HouseRecapStore);

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

const createStore = (input: { alreadyPosted?: boolean } = {}) => {
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

  return {
    posts,
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
      }
    } satisfies HouseRecapStore
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
    const { store, posts } = createStore();
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

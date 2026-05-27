import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  autoPostPracticeRecapAfterEnd,
  getPracticeRecapAutoPostTarget,
  type PracticeRecapAutoPostChannel,
  type PracticeRecapAutoPostStore,
  type PracticeRecapPostRecord
} from "../src/features/practice/practice-recap-autopost.service.js";
import type {
  PracticeCheckInRecord,
  PracticeSessionRecord
} from "../src/features/practice/practice.service.js";

const now = new Date("2026-05-27T12:00:00.000Z");

const buildSession = (
  overrides: Partial<PracticeSessionRecord> = {}
): PracticeSessionRecord => ({
  id: "session_123",
  guildId: "guild_123",
  startedByUserId: "coach_123",
  startedByDisplayName: "Coach",
  announcementChannelId: "practice_channel",
  source: "MANUAL",
  scheduledDateKey: null,
  scheduledStartAt: null,
  scheduledEndAt: null,
  rsvpMessageId: null,
  rsvpPostedAt: null,
  attendanceMessageId: null,
  attendancePostedAt: null,
  status: "ENDED",
  startedAt: new Date("2026-05-27T10:00:00.000Z"),
  endedAt: new Date("2026-05-27T12:00:00.000Z"),
  endedByUserId: "coach_123",
  ...overrides
});

const buildCheckIn = (
  overrides: Partial<PracticeCheckInRecord> = {}
): PracticeCheckInRecord => ({
  id: "checkin_123",
  sessionId: "session_123",
  guildId: "guild_123",
  userId: "user_123",
  displayName: "Mira",
  rsvpStatus: null,
  attendanceStatus: "HERE",
  rewardAppliedAt: now,
  rewardXp: 30,
  checkedInAt: new Date("2026-05-27T11:00:00.000Z"),
  updatedAt: new Date("2026-05-27T11:00:00.000Z"),
  ...overrides
});

const buildPost = (
  overrides: Partial<PracticeRecapPostRecord> = {}
): PracticeRecapPostRecord => ({
  id: "recap_post_123",
  guildId: "guild_123",
  practiceId: "session_123",
  channelId: "practice_channel",
  messageId: "message_123",
  postedAt: now,
  ...overrides
});

const createChannel = (
  channelId: string,
  send = vi.fn(async () => ({ id: `message_${channelId}` }))
): PracticeRecapAutoPostChannel => ({
  id: channelId,
  isTextBased: () => true,
  send
});

const createStore = (
  input: {
    sessions?: PracticeSessionRecord[];
    checkIns?: PracticeCheckInRecord[];
    posts?: PracticeRecapPostRecord[];
    scheduleChannelId?: string | null;
    createPostError?: unknown;
  } = {}
): {
  store: PracticeRecapAutoPostStore;
  posts: PracticeRecapPostRecord[];
} => {
  const sessions = input.sessions ?? [buildSession()];
  const checkIns = input.checkIns ?? [buildCheckIn()];
  const posts = [...(input.posts ?? [])];

  return {
    posts,
    store: {
      practiceSession: {
        findFirst: vi.fn(async () => sessions[0] ?? null),
        findUnique: vi.fn(async ({ where }) =>
          sessions.find((session) => session.id === where.id) ?? null
        ),
        findMany: vi.fn(async () => sessions)
      },
      practiceCheckIn: {
        findMany: vi.fn(async ({ where }) =>
          checkIns.filter((checkIn) => {
            const sessionMatches =
              typeof where.sessionId === "object"
                ? where.sessionId.in.includes(checkIn.sessionId)
                : where.sessionId === undefined ||
                  checkIn.sessionId === where.sessionId;

            return (
              checkIn.guildId === where.guildId &&
              sessionMatches &&
              (where.userId === undefined || checkIn.userId === where.userId) &&
              (where.attendanceStatus === undefined ||
                checkIn.attendanceStatus === where.attendanceStatus)
            );
          })
        )
      },
      house: {
        findMany: vi.fn(async () => [])
      },
      housePointLedger: {
        findMany: vi.fn(async () => [])
      },
      practiceSchedule: {
        findUnique: vi.fn(async () =>
          input.scheduleChannelId === undefined
            ? null
            : {
                channelId: input.scheduleChannelId
              }
        )
      },
      practiceRecapPost: {
        findUnique: vi.fn(async ({ where }) =>
          posts.find(
            (post) =>
              post.guildId === where.guildId_practiceId.guildId &&
              post.practiceId === where.guildId_practiceId.practiceId
          ) ?? null
        ),
        create: vi.fn(async ({ data }) => {
          if (input.createPostError) {
            throw input.createPostError;
          }

          const post = buildPost({
            id: `recap_post_${posts.length + 1}`,
            guildId: data.guildId,
            practiceId: data.practiceId,
            channelId: data.channelId,
            messageId: data.messageId ?? null
          });
          posts.push(post);
          return post;
        })
      }
    }
  };
};

describe("practice recap auto-post service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("builds, sends, and records a recap for a completed practice", async () => {
    const { store, posts } = createStore();
    const channel = createChannel("practice_channel");
    const client = {
      channels: {
        fetch: vi.fn(async () => channel)
      }
    };

    const result = await autoPostPracticeRecapAfterEnd(store, {
      guildId: "guild_123",
      practiceId: "session_123",
      session: buildSession(),
      now,
      client
    });

    expect(result).toEqual({
      outcome: "posted",
      channelId: "practice_channel",
      messageId: "message_practice_channel"
    });
    expect(channel.send).toHaveBeenCalledWith({
      content: expect.stringContaining("Practice Recap - May 27, 2026")
    });
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({
      guildId: "guild_123",
      practiceId: "session_123",
      channelId: "practice_channel",
      messageId: "message_practice_channel"
    });
  });

  it("skips when an automatic recap post already exists", async () => {
    const existingPost = buildPost();
    const { store, posts } = createStore({
      posts: [existingPost]
    });
    const channel = createChannel("practice_channel");

    const result = await autoPostPracticeRecapAfterEnd(store, {
      guildId: "guild_123",
      practiceId: "session_123",
      session: buildSession(),
      now,
      commandChannel: channel
    });

    expect(result).toEqual({
      outcome: "skipped_duplicate",
      channelId: "practice_channel",
      messageId: "message_123"
    });
    expect(channel.send).not.toHaveBeenCalled();
    expect(posts).toEqual([existingPost]);
  });

  it("uses the scheduled practice channel before falling back to the command channel", async () => {
    const { store } = createStore({
      scheduleChannelId: "schedule_channel"
    });
    const scheduleChannel = createChannel("schedule_channel");
    const commandChannel = createChannel("command_channel");
    const client = {
      channels: {
        fetch: vi.fn(async (channelId: string) =>
          channelId === "schedule_channel" ? scheduleChannel : null
        )
      }
    };

    const target = await getPracticeRecapAutoPostTarget(store, {
      guildId: "guild_123",
      practiceId: "session_123",
      session: buildSession(),
      commandChannel,
      client
    });

    expect(target?.id).toBe("schedule_channel");
    expect(client.channels.fetch).toHaveBeenCalledWith("practice_channel");
    expect(client.channels.fetch).toHaveBeenCalledWith("schedule_channel");
  });

  it("falls back to the command channel when configured targets cannot be resolved", async () => {
    const { store } = createStore();
    const commandChannel = createChannel("command_channel");
    const client = {
      channels: {
        fetch: vi.fn(async () => null)
      }
    };

    const result = await autoPostPracticeRecapAfterEnd(store, {
      guildId: "guild_123",
      practiceId: "session_123",
      session: buildSession(),
      now,
      commandChannel,
      client
    });

    expect(result.outcome).toBe("posted");
    expect(result.channelId).toBe("command_channel");
    expect(commandChannel.send).toHaveBeenCalled();
  });

  it("handles missing channels without throwing", async () => {
    const { store } = createStore();
    const client = {
      channels: {
        fetch: vi.fn(async () => null)
      }
    };

    const result = await autoPostPracticeRecapAfterEnd(store, {
      guildId: "guild_123",
      practiceId: "session_123",
      session: buildSession(),
      now,
      client
    });

    expect(result).toEqual({
      outcome: "skipped_missing_channel"
    });
  });

  it("does not record a post if sending fails", async () => {
    const { store, posts } = createStore();
    const sendError = new Error("cannot send");
    const channel = createChannel(
      "practice_channel",
      vi.fn(async () => {
        throw sendError;
      })
    );

    const result = await autoPostPracticeRecapAfterEnd(store, {
      guildId: "guild_123",
      practiceId: "session_123",
      session: buildSession(),
      now,
      commandChannel: channel
    });

    expect(result).toEqual({
      outcome: "failed",
      error: sendError
    });
    expect(posts).toEqual([]);
  });

  it("reports a generated message if tracking fails after send", async () => {
    const trackingError = new Error("unique constraint unavailable");
    const { store, posts } = createStore({
      createPostError: trackingError
    });
    const channel = createChannel("practice_channel");

    const result = await autoPostPracticeRecapAfterEnd(store, {
      guildId: "guild_123",
      practiceId: "session_123",
      session: buildSession(),
      now,
      commandChannel: channel
    });

    expect(result).toEqual({
      outcome: "posted_untracked",
      channelId: "practice_channel",
      messageId: "message_practice_channel"
    });
    expect(posts).toEqual([]);
  });

  it("skips when recap generation is not valid for the session", async () => {
    const { store } = createStore({
      sessions: [
        buildSession({
          status: "ACTIVE",
          endedAt: null
        })
      ]
    });
    const channel = createChannel("practice_channel");

    const result = await autoPostPracticeRecapAfterEnd(store, {
      guildId: "guild_123",
      practiceId: "session_123",
      session: buildSession({
        status: "ACTIVE",
        endedAt: null
      }),
      now,
      commandChannel: channel
    });

    expect(result).toEqual({
      outcome: "skipped_no_recap"
    });
    expect(channel.send).not.toHaveBeenCalled();
  });
});

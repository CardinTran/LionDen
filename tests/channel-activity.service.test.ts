import { describe, expect, it, afterEach } from "vitest";

import {
  listMostActiveChannels,
  recordChannelActivity,
  resetChannelActivityState
} from "../src/features/economy/channel-activity.service.js";

describe("channel activity service", () => {
  afterEach(() => {
    resetChannelActivityState();
  });

  it("returns channels ranked by recent human message activity", () => {
    const now = new Date("2026-05-14T18:00:00.000Z");

    for (let count = 0; count < 7; count += 1) {
      recordChannelActivity({
        guildId: "guild_123",
        channelId: "channel_alpha",
        occurredAt: new Date(now.getTime() - count * 60_000)
      });
    }

    for (let count = 0; count < 5; count += 1) {
      recordChannelActivity({
        guildId: "guild_123",
        channelId: "channel_beta",
        occurredAt: new Date(now.getTime() - count * 60_000)
      });
    }

    expect(
      listMostActiveChannels({
        guildId: "guild_123",
        now
      })
    ).toEqual([
      {
        channelId: "channel_alpha",
        messageCount: 7
      },
      {
        channelId: "channel_beta",
        messageCount: 5
      }
    ]);
  });

  it("ignores channels that do not meet the minimum recent activity threshold", () => {
    const now = new Date("2026-05-14T18:00:00.000Z");

    for (let count = 0; count < 4; count += 1) {
      recordChannelActivity({
        guildId: "guild_123",
        channelId: "quiet_channel",
        occurredAt: new Date(now.getTime() - count * 60_000)
      });
    }

    expect(
      listMostActiveChannels({
        guildId: "guild_123",
        now
      })
    ).toEqual([]);
  });

  it("prunes old activity outside the rolling window", () => {
    const now = new Date("2026-05-14T18:00:00.000Z");

    for (let count = 0; count < 5; count += 1) {
      recordChannelActivity({
        guildId: "guild_123",
        channelId: "channel_alpha",
        occurredAt: new Date(now.getTime() - count * 60_000)
      });
    }

    recordChannelActivity({
      guildId: "guild_123",
      channelId: "channel_alpha",
      occurredAt: new Date("2026-05-14T15:00:00.000Z")
    });

    expect(
      listMostActiveChannels({
        guildId: "guild_123",
        now
      })
    ).toEqual([
      {
        channelId: "channel_alpha",
        messageCount: 5
      }
    ]);
  });
});

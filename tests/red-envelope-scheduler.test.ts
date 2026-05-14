import { afterEach, describe, expect, it, vi } from "vitest";

import {
  recordChannelActivity,
  resetChannelActivityState
} from "../src/features/economy/channel-activity.service.js";
import { resolveDropChannel } from "../src/features/economy/red-envelope-scheduler.js";

describe("red envelope scheduler", () => {
  afterEach(() => {
    resetChannelActivityState();
  });

  it("prefers the most active eligible channel over the configured fallback", async () => {
    const now = new Date("2026-05-14T18:00:00.000Z");

    for (let count = 0; count < 6; count += 1) {
      recordChannelActivity({
        guildId: "guild_123",
        channelId: "active_channel",
        occurredAt: new Date(now.getTime() - count * 60_000)
      });
    }

    const fetch = vi.fn(async (channelId: string) => ({
      id: channelId,
      isTextBased: () => true,
      send: vi.fn()
    }));

    const result = await resolveDropChannel(
      {
        channels: {
          fetch
        }
      } as never,
      {
        guildId: "guild_123",
        fallbackChannelId: "fallback_channel",
        now
      }
    );

    expect(result?.channel.id).toBe("active_channel");
    expect(result?.usedActiveTargeting).toBe(true);
    expect(fetch).toHaveBeenCalledWith("active_channel");
  });

  it("falls back to the configured channel when no active channel meets the threshold", async () => {
    const now = new Date("2026-05-14T18:00:00.000Z");
    const fetch = vi.fn(async (channelId: string) => ({
      id: channelId,
      isTextBased: () => true,
      send: vi.fn()
    }));

    const result = await resolveDropChannel(
      {
        channels: {
          fetch
        }
      } as never,
      {
        guildId: "guild_123",
        fallbackChannelId: "fallback_channel",
        now
      }
    );

    expect(result?.channel.id).toBe("fallback_channel");
    expect(result?.usedActiveTargeting).toBe(false);
    expect(fetch).toHaveBeenCalledWith("fallback_channel");
  });
});

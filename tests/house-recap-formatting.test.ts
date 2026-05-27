import { describe, expect, it } from "vitest";

import {
  formatHouseRecapConfiguredMessage,
  formatHouseRecapPostResultMessage,
  formatHouseRecapStatusMessage,
  formatWeeklyHouseRecap
} from "../src/features/houses/house-recap-formatting.js";
import type {
  HouseRecapConfigRecord,
  HouseRecapStatus,
  WeeklyHouseRecap
} from "../src/features/houses/house-recap.service.js";
import type { HouseRecord } from "../src/features/houses/house.service.js";

const now = new Date("2026-05-26T12:00:00.000Z");

const house: HouseRecord = {
  id: "house_red",
  guildId: "guild_123",
  houseKey: "red-house",
  name: "Red House",
  description: null,
  emoji: "R",
  color: null,
  isActive: true,
  createdAt: now,
  updatedAt: now
};

const config: HouseRecapConfigRecord = {
  id: "config_123",
  guildId: "guild_123",
  channelId: "channel_123",
  isEnabled: true,
  weekday: 0,
  hour: 18,
  minute: 0,
  timezone: "America/Chicago",
  createdAt: now,
  updatedAt: now
};

const buildRecap = (
  overrides: Partial<WeeklyHouseRecap> = {}
): WeeklyHouseRecap => ({
  guildId: "guild_123",
  weekKey: "2026-W22",
  range: {
    start: new Date("2026-05-25T00:00:00.000Z"),
    end: new Date("2026-06-01T00:00:00.000Z")
  },
  houses: [house],
  ledgerEntries: [],
  standings: [
    {
      rank: 1,
      house,
      points: 12
    }
  ],
  topContributors: [
    {
      rank: 1,
      userId: "user_123",
      points: 11,
      sourceBreakdown: {
        PRACTICE_ATTENDANCE: 10,
        LION_CATCH: 1
      }
    }
  ],
  sourceBreakdown: [
    {
      sourceType: "PRACTICE_ATTENDANCE",
      points: 10
    },
    {
      sourceType: "LION_CATCH",
      points: 1
    }
  ],
  categoryWinners: [
    {
      category: "practice",
      label: "Most practice points",
      house,
      points: 10
    },
    {
      category: "redEnvelope",
      label: "Most red envelope points",
      house: null,
      points: 0
    }
  ],
  hasHouses: true,
  hasPoints: true,
  ...overrides
});

describe("house recap formatting", () => {
  it("formats a complete weekly recap with standings, contributors, highlights, and breakdown", () => {
    const output = formatWeeklyHouseRecap(buildRecap());

    expect(output).toContain("House Cup Weekly Recap");
    expect(output).toContain("Week: 2026-W22");
    expect(output).toContain("1. R Red House - 12 pts");
    expect(output).toContain("<@user_123> - 11 pts");
    expect(output).toContain("Most practice points: R Red House");
    expect(output).toContain("Practice: 10 pts");
    expect(output.length).toBeLessThan(2000);
  });

  it("formats empty recap states", () => {
    expect(
      formatWeeklyHouseRecap(
        buildRecap({
          houses: [],
          standings: [],
          topContributors: [],
          sourceBreakdown: [],
          categoryWinners: [],
          hasHouses: false,
          hasPoints: false
        })
      )
    ).toContain("No active Houses are configured yet.");

    expect(
      formatWeeklyHouseRecap(
        buildRecap({
          standings: [
            {
              rank: 1,
              house,
              points: 0
            }
          ],
          topContributors: [],
          sourceBreakdown: [],
          hasPoints: false
        })
      )
    ).toContain("No House points were earned this week yet.");
  });

  it("formats config, status, and post result messages", () => {
    const status: HouseRecapStatus = {
      config,
      weekKey: "2026-W22",
      alreadyPosted: false,
      currentWeekPost: null,
      lastPost: null
    };

    expect(formatHouseRecapConfiguredMessage(config)).toContain(
      "Weekly House Recap enabled"
    );
    expect(formatHouseRecapStatusMessage(status)).toContain(
      "Current week posted: no"
    );
    expect(
      formatHouseRecapPostResultMessage({
        outcome: "skipped_duplicate",
        weekKey: "2026-W22",
        channelId: "channel_123"
      })
    ).toContain("already been posted");
  });
});

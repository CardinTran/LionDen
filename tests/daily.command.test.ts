import { describe, expect, it } from "vitest";

import {
  dailyCommandJson,
  formatDailyCooldownMessage,
  formatDailySuccessMessage
} from "../src/bot/commands/daily.js";

describe("daily command", () => {
  it("exports the expected slash command metadata", () => {
    expect(dailyCommandJson.name).toBe("daily");
    expect(dailyCommandJson.description).toBe(
      "Claim your daily LionDen coin reward."
    );
  });

  it("formats a successful daily claim message", () => {
    expect(
      formatDailySuccessMessage({
        displayName: "Cardin",
        coinsAwarded: 25,
        totalCoins: 60
      })
    ).toBe(
      [
        "Cardin claimed today's daily reward.",
        "You received 25 coins and now have 60 total coins."
      ].join("\n")
    );
  });

  it("formats a daily cooldown message", () => {
    expect(
      formatDailyCooldownMessage({
        displayName: "Cardin",
        nextClaimAt: new Date("2026-05-15T05:00:00.000Z")
      })
    ).toContain("Cardin already claimed today's daily reward.");
  });
});

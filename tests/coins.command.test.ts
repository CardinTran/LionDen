import { describe, expect, it } from "vitest";

import {
  coinsCommandJson,
  formatCoinAdjustmentMessage
} from "../src/bot/commands/coins.js";

describe("coins command", () => {
  it("exports the expected slash command metadata", () => {
    expect(coinsCommandJson.name).toBe("coins");
    expect(coinsCommandJson.description).toBe(
      "Admin controls for adjusting LionDen coins."
    );
    expect(coinsCommandJson.options?.map((option) => option.name)).toEqual([
      "add",
      "remove"
    ]);
  });

  it("formats a coin adjustment confirmation", () => {
    expect(
      formatCoinAdjustmentMessage({
        actorName: "OfficerA",
        targetName: "MemberB",
        action: "add",
        amount: 25,
        coins: 60
      })
    ).toBe(
      [
        "OfficerA added 25 coins for MemberB.",
        "MemberB now has 60 total coins."
      ].join("\n")
    );
  });
});

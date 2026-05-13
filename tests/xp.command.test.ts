import { describe, expect, it } from "vitest";

import {
  formatXpAdjustmentMessage,
  xpCommandJson
} from "../src/bot/commands/xp.js";

describe("xp command", () => {
  it("exports the expected slash command metadata", () => {
    expect(xpCommandJson.name).toBe("xp");
    expect(xpCommandJson.description).toBe(
      "Admin controls for adjusting LionDen XP."
    );
    expect(xpCommandJson.options?.map((option) => option.name)).toEqual([
      "add",
      "remove"
    ]);
  });

  it("formats an xp adjustment confirmation", () => {
    expect(
      formatXpAdjustmentMessage({
        actorName: "OfficerA",
        targetName: "MemberB",
        action: "add",
        amount: 25,
        xp: 125,
        level: 2
      })
    ).toBe(
      [
        "OfficerA added 25 XP for MemberB.",
        "MemberB is now Level 2 with 125 total XP."
      ].join("\n")
    );
  });
});

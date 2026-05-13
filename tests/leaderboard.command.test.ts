import { describe, expect, it } from "vitest";

import {
  formatLeaderboardMessage,
  leaderboardCommandJson
} from "../src/bot/commands/leaderboard.js";

describe("leaderboard command", () => {
  it("exports the expected slash command metadata", () => {
    expect(leaderboardCommandJson.name).toBe("leaderboard");
    expect(leaderboardCommandJson.description).toBe(
      "View the top LionDen XP rankings for this server."
    );
  });

  it("formats an empty leaderboard state", () => {
    expect(formatLeaderboardMessage([])).toBe(
      "No LionDen rankings yet. Start chatting to claim the first spot."
    );
  });

  it("formats ranked leaderboard entries with levels", () => {
    expect(
      formatLeaderboardMessage([
        { displayName: "Alicia", xp: 225 },
        { displayName: "Bao", xp: 100 },
        { displayName: "Chris", xp: 95 }
      ])
    ).toBe(
      [
        "LionDen Leaderboard",
        "1. Alicia — Level 3 (225 XP)",
        "2. Bao — Level 2 (100 XP)",
        "3. Chris — Level 1 (95 XP)"
      ].join("\n")
    );
  });
});

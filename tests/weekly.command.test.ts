import { describe, expect, it } from "vitest";

import {
  formatWeeklyBadgesMessage,
  formatWeeklyChallengesMessage,
  weeklyCommandJson
} from "../src/bot/commands/weekly.js";

const now = new Date("2026-05-25T12:00:00.000Z");

describe("weekly command", () => {
  it("exports challenge and badge subcommands", () => {
    expect(weeklyCommandJson.name).toBe("weekly");
    expect(weeklyCommandJson.options?.map((option) => option.name)).toEqual([
      "challenges",
      "badges"
    ]);
  });

  it("formats weekly challenge progress", () => {
    expect(
      formatWeeklyChallengesMessage({
        weekKey: "2026-W22",
        challenges: [
          {
            definition: {
              id: "challenge_123",
              challengeKey: "practice-presence",
              title: "Practice Presence",
              description:
                "Mark yourself here for one practice attendance session.",
              activityType: "PRACTICE_ATTENDANCE",
              targetCount: 1,
              rewardXp: 25,
              rewardCoins: 20,
              isEnabled: true,
              createdAt: now,
              updatedAt: now
            },
            progress: null,
            progressCount: 0,
            isCompleted: false
          }
        ]
      })
    ).toBe(
      [
        "LionDen weekly challenges",
        "Week: 2026-W22",
        "[todo] Practice Presence: 0/1 - Mark yourself here for one practice attendance session. Reward: 25 XP, 20 coins."
      ].join("\n")
    );
  });

  it("formats earned badges", () => {
    expect(
      formatWeeklyBadgesMessage({
        displayName: "Mira",
        badges: [
          {
            badge: {
              id: "user_badge_123",
              guildId: "guild_123",
              userId: "user_123",
              badgeKey: "weekly-starter",
              awardedAt: now
            },
            definition: {
              id: "badge_123",
              badgeKey: "weekly-starter",
              title: "Weekly Starter",
              description: "Complete at least one LionDen weekly challenge.",
              isEnabled: true,
              createdAt: now,
              updatedAt: now
            }
          }
        ]
      })
    ).toBe(
      [
        "Mira's LionDen badges:",
        "- Weekly Starter: Complete at least one LionDen weekly challenge. Earned <t:1779710400:R>."
      ].join("\n")
    );
  });
});

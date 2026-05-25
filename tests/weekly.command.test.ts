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

  it("formats empty weekly challenge lists", () => {
    expect(
      formatWeeklyChallengesMessage({
        weekKey: "2026-W22",
        challenges: []
      })
    ).toBe("No weekly challenges are enabled right now.");
  });

  it("formats partial and completed weekly challenge progress", () => {
    expect(
      formatWeeklyChallengesMessage({
        weekKey: "2026-W22",
        challenges: [
          {
            definition: {
              id: "challenge_123",
              challengeKey: "lion-catcher",
              title: "Lion Catcher",
              description: "Catch three wild lions this week.",
              activityType: "LION_CATCH",
              targetCount: 3,
              rewardXp: 20,
              rewardCoins: 15,
              isEnabled: true,
              createdAt: now,
              updatedAt: now
            },
            progress: {
              id: "progress_123",
              guildId: "guild_123",
              userId: "user_123",
              challengeKey: "lion-catcher",
              weekKey: "2026-W22",
              progressCount: 2,
              completedAt: null,
              rewardedAt: null,
              createdAt: now,
              updatedAt: now
            },
            progressCount: 2,
            isCompleted: false
          },
          {
            definition: {
              id: "challenge_456",
              challengeKey: "lucky-envelope",
              title: "Lucky Envelope",
              description: "Claim one red envelope this week.",
              activityType: "RED_ENVELOPE_CLAIM",
              targetCount: 1,
              rewardXp: 0,
              rewardCoins: 25,
              isEnabled: true,
              createdAt: now,
              updatedAt: now
            },
            progress: {
              id: "progress_456",
              guildId: "guild_123",
              userId: "user_123",
              challengeKey: "lucky-envelope",
              weekKey: "2026-W22",
              progressCount: 1,
              completedAt: now,
              rewardedAt: now,
              createdAt: now,
              updatedAt: now
            },
            progressCount: 1,
            isCompleted: true
          }
        ]
      })
    ).toBe(
      [
        "LionDen weekly challenges",
        "Week: 2026-W22",
        "[todo] Lion Catcher: 2/3 - Catch three wild lions this week. Reward: 20 XP, 15 coins.",
        "[done] Lucky Envelope: 1/1 - Claim one red envelope this week. Reward: 25 coins."
      ].join("\n")
    );
  });

  it("formats badge-progress rewards when no XP or coins are configured", () => {
    expect(
      formatWeeklyChallengesMessage({
        weekKey: "2026-W22",
        challenges: [
          {
            definition: {
              id: "challenge_789",
              challengeKey: "badge-only",
              title: "Badge Only",
              description: "Complete a badge-only challenge.",
              activityType: "PRACTICE_ATTENDANCE",
              targetCount: 1,
              rewardXp: 0,
              rewardCoins: 0,
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
    ).toContain("Reward: badge progress.");
  });

  it("formats no earned badges", () => {
    expect(
      formatWeeklyBadgesMessage({
        displayName: "Mira",
        badges: []
      })
    ).toBe("Mira has not earned any LionDen badges yet.");
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

  it("formats earned badges when definition metadata is unavailable", () => {
    expect(
      formatWeeklyBadgesMessage({
        displayName: "Mira",
        badges: [
          {
            badge: {
              id: "user_badge_456",
              guildId: "guild_123",
              userId: "user_123",
              badgeKey: "legacy-badge",
              awardedAt: now
            },
            definition: null
          }
        ]
      })
    ).toBe(
      [
        "Mira's LionDen badges:",
        "- legacy-badge: Badge definition unavailable. Earned <t:1779710400:R>."
      ].join("\n")
    );
  });
});

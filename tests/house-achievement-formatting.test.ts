import { describe, expect, it } from "vitest";

import {
  formatHouseBadgeGrantMessage,
  formatHouseBadgeSyncMessage,
  formatRecentHouseBadgesSummary,
  formatUserHouseBadgesMessage
} from "../src/features/houses/house-achievement-formatting.js";
import type {
  HouseBadgeAwardResult,
  HouseBadgeDefinitionRecord,
  UserHouseBadgeRecord,
  UserHouseBadgeViewEntry
} from "../src/features/houses/house-achievement.service.js";

const now = new Date("2026-05-26T12:00:00.000Z");

const definition: HouseBadgeDefinitionRecord = {
  id: "definition_123",
  badgeKey: "house-champion",
  title: "House Champion",
  description: "Belonged to the weekly winning House when a recap posted.",
  category: "WEEKLY_RECAP",
  isEnabled: true,
  createdAt: now,
  updatedAt: now
};

const award: UserHouseBadgeRecord = {
  id: "award_123",
  guildId: "guild_123",
  userId: "user_123",
  badgeKey: "house-champion",
  houseId: "house_red",
  weekKey: "2026-W22",
  awardedAt: now,
  reason: "Weekly recap."
};

const entry = (
  overrides: Partial<UserHouseBadgeViewEntry> = {}
): UserHouseBadgeViewEntry => ({
  award,
  definition,
  ...overrides
});

describe("house achievement formatting", () => {
  it("formats empty and earned House badge lists", () => {
    expect(
      formatUserHouseBadgesMessage({
        displayName: "Mira",
        badges: []
      })
    ).toBe("Mira has not earned any House badges yet.");

    const output = formatUserHouseBadgesMessage({
      displayName: "Mira",
      badges: [entry()]
    });

    expect(output).toContain("Mira's House badges:");
    expect(output).toContain("House Champion");
    expect(output).toContain("Week 2026-W22");
    expect(output).toContain("Earned <t:");
  });

  it("caps long House badge lists", () => {
    const badges = Array.from({ length: 14 }, (_, index) =>
      entry({
        award: {
          ...award,
          id: `award_${index}`,
          badgeKey: `badge_${index}`
        },
        definition: {
          ...definition,
          badgeKey: `badge_${index}`,
          title: `Badge ${index}`
        }
      })
    );

    expect(
      formatUserHouseBadgesMessage({
        displayName: "Mira",
        badges,
        limit: 12
      })
    ).toContain("Showing 12 of 14 House badges.");
  });

  it("formats recent badge summaries and admin confirmations", () => {
    expect(formatRecentHouseBadgesSummary([entry()])).toBe(
      "Recent House Badges: House Champion"
    );
    expect(formatRecentHouseBadgesSummary([])).toBeNull();
    expect(formatHouseBadgeSyncMessage([definition])).toBe(
      "Synced 1 default House badge definition."
    );
  });

  it("formats badge grant outcomes", () => {
    const result: HouseBadgeAwardResult = {
      outcome: "awarded",
      award,
      definition
    };

    expect(
      formatHouseBadgeGrantMessage({
        targetName: "Mira",
        result
      })
    ).toBe("Granted House Champion to Mira.");
    expect(
      formatHouseBadgeGrantMessage({
        targetName: "Mira",
        result: {
          ...result,
          outcome: "already_awarded"
        }
      })
    ).toBe("Mira already has House Champion.");
  });
});

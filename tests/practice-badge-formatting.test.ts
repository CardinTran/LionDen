import { describe, expect, it } from "vitest";

import type {
  BadgeDefinitionRecord,
  UserBadgeRecord
} from "../src/features/challenges/weekly-challenge.service.js";
import {
  formatCompactPracticeBadgeSummary,
  formatPracticeBadgeListMessage,
  formatPracticeBadgeSyncSummaryMessage
} from "../src/features/practice/practice-badge-formatting.js";

const now = new Date("2026-05-27T12:00:00.000Z");

const buildDefinition = (
  badgeKey: string,
  title: string
): BadgeDefinitionRecord => ({
  id: `definition_${badgeKey}`,
  badgeKey,
  title,
  description: `${title} description.`,
  isEnabled: true,
  createdAt: now,
  updatedAt: now
});

const buildBadge = (badgeKey: string): UserBadgeRecord => ({
  id: `award_${badgeKey}`,
  guildId: "guild_123",
  userId: "user_123",
  badgeKey,
  awardedAt: now
});

const buildEntry = (badgeKey: string, title: string) => ({
  badge: buildBadge(badgeKey),
  definition: buildDefinition(badgeKey, title)
});

describe("practice badge formatting", () => {
  it("formats a user practice badge list", () => {
    const message = formatPracticeBadgeListMessage({
      displayName: "Mira",
      badges: [buildEntry("first-practice", "First Practice")]
    });

    expect(message).toContain("Mira's practice badges:");
    expect(message).toContain("First Practice");
    expect(message).toContain("Awarded <t:");
  });

  it("formats no practice badges", () => {
    expect(
      formatPracticeBadgeListMessage({
        displayName: "Mira",
        badges: []
      })
    ).toBe("Mira has not earned any practice badges yet.");
  });

  it("caps long badge lists", () => {
    const message = formatPracticeBadgeListMessage({
      displayName: "Mira",
      badges: Array.from({ length: 12 }, (_value, index) =>
        buildEntry(`badge_${index}`, `Badge ${index}`)
      )
    });

    expect(message).toContain("Showing the most recent practice badges only.");
    expect(message).not.toContain("Badge 11");
  });

  it("formats sync summaries", () => {
    expect(
      formatPracticeBadgeSyncSummaryMessage({
        definitionsSynced: 6,
        usersEvaluated: 2,
        awarded: 3,
        alreadyAwarded: 1,
        skipped: 0
      })
    ).toContain("Practice badge sync complete.");
  });

  it("formats compact streak badge summaries", () => {
    expect(
      formatCompactPracticeBadgeSummary([
        buildEntry("first-practice", "First Practice"),
        buildEntry("perfect-week", "Perfect Week")
      ])
    ).toBe("Practice Badges: First Practice, Perfect Week");
    expect(formatCompactPracticeBadgeSummary([])).toBeNull();
  });
});

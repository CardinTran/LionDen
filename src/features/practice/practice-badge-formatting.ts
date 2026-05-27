import type {
  PracticeBadgeBackfillSummary,
  PracticeBadgeViewEntry
} from "./practice-badge.service.js";

const MAX_BADGE_ROWS = 10;
const MAX_COMPACT_BADGES = 3;

const formatAwardedAt = (date: Date): string =>
  `<t:${Math.floor(date.getTime() / 1000)}:R>`;

export const formatPracticeBadgeListMessage = (input: {
  displayName: string;
  badges: PracticeBadgeViewEntry[];
}): string => {
  if (input.badges.length === 0) {
    return `${input.displayName} has not earned any practice badges yet.`;
  }

  const visibleBadges = input.badges.slice(0, MAX_BADGE_ROWS);
  const lines = [
    `${input.displayName}'s practice badges:`,
    ...visibleBadges.map((entry) => {
      const title = entry.definition?.title ?? entry.badge.badgeKey;
      const description = entry.definition?.description ?? "Practice badge";

      return `- ${title}: ${description} Awarded ${formatAwardedAt(entry.badge.awardedAt)}.`;
    })
  ];

  if (input.badges.length > visibleBadges.length) {
    lines.push("Showing the most recent practice badges only.");
  }

  return lines.join("\n");
};

export const formatPracticeBadgeSyncSummaryMessage = (
  summary: PracticeBadgeBackfillSummary
): string =>
  [
    "Practice badge sync complete.",
    `Definitions synced: ${summary.definitionsSynced}`,
    `Users evaluated: ${summary.usersEvaluated}`,
    `New awards: ${summary.awarded}`,
    `Already awarded: ${summary.alreadyAwarded}`,
    `Skipped: ${summary.skipped}`
  ].join("\n");

export const formatCompactPracticeBadgeSummary = (
  badges: PracticeBadgeViewEntry[]
): string | null => {
  if (badges.length === 0) {
    return null;
  }

  const visibleBadges = badges.slice(0, MAX_COMPACT_BADGES);
  const titles = visibleBadges.map(
    (entry) => entry.definition?.title ?? entry.badge.badgeKey
  );

  return `Practice Badges: ${titles.join(", ")}${badges.length > visibleBadges.length ? ", and more" : ""}`;
};

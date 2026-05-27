import type {
  HouseBadgeAwardResult,
  HouseBadgeDefinitionRecord,
  UserHouseBadgeViewEntry
} from "./house-achievement.service.js";

const DISCORD_MESSAGE_LIMIT = 2000;
const DEFAULT_BADGE_LIST_LIMIT = 12;
const DEFAULT_RECENT_BADGE_LIMIT = 3;

const formatAwardedAt = (date: Date): string =>
  `<t:${Math.floor(date.getTime() / 1000)}:R>`;

const formatBadgeTitle = (entry: UserHouseBadgeViewEntry): string =>
  entry.definition?.title ?? entry.award.badgeKey;

export const formatUserHouseBadgesMessage = (input: {
  displayName: string;
  badges: UserHouseBadgeViewEntry[];
  limit?: number;
}): string => {
  if (input.badges.length === 0) {
    return `${input.displayName} has not earned any House badges yet.`;
  }

  const limit = input.limit ?? DEFAULT_BADGE_LIST_LIMIT;
  const visibleBadges = input.badges.slice(0, limit);
  const lines = [
    `${input.displayName}'s House badges:`,
    ...visibleBadges.map((entry) => {
      const title = formatBadgeTitle(entry);
      const description =
        entry.definition?.description ?? "Badge definition unavailable.";
      const week = entry.award.weekKey ? ` Week ${entry.award.weekKey}.` : "";

      return `- ${title}: ${description}${week} Earned ${formatAwardedAt(entry.award.awardedAt)}.`;
    })
  ];

  if (input.badges.length > visibleBadges.length) {
    lines.push(
      `Showing ${visibleBadges.length} of ${input.badges.length} House badges.`
    );
  }

  const message = lines.join("\n");

  if (message.length <= DISCORD_MESSAGE_LIMIT) {
    return message;
  }

  return [
    `${input.displayName}'s House badges:`,
    ...visibleBadges.slice(0, 8).map((entry) => `- ${formatBadgeTitle(entry)}`),
    `Showing a shorter list because Discord messages are limited.`
  ].join("\n");
};

export const formatRecentHouseBadgesSummary = (
  badges: UserHouseBadgeViewEntry[],
  limit = DEFAULT_RECENT_BADGE_LIMIT
): string | null => {
  if (badges.length === 0) {
    return null;
  }

  return `Recent House Badges: ${badges
    .slice(0, limit)
    .map(formatBadgeTitle)
    .join(", ")}`;
};

export const formatHouseBadgeSyncMessage = (
  definitions: HouseBadgeDefinitionRecord[]
): string =>
  `Synced ${definitions.length} default House badge definition${definitions.length === 1 ? "" : "s"}.`;

export const formatHouseBadgeGrantMessage = (input: {
  targetName: string;
  result: HouseBadgeAwardResult;
}): string => {
  const title = input.result.definition?.title ?? "House badge";

  switch (input.result.outcome) {
    case "awarded":
      return `Granted ${title} to ${input.targetName}.`;
    case "already_awarded":
      return `${input.targetName} already has ${title}.`;
    case "definition_disabled":
      return `${title} is disabled and was not granted.`;
    case "definition_missing":
      return "I could not find that House badge definition. Run `/houseadmin badge sync` or check the badge key.";
  }
};

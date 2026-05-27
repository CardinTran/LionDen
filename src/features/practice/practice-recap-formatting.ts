import type {
  PracticeRecap,
  PracticeRecapHousePointEntry,
  PracticeRecapStreakHighlight
} from "./practice-recap.service.js";

const MAX_HOUSE_POINT_ROWS = 5;
const MAX_STREAK_ROWS = 3;

const pluralize = (count: number, singular: string, plural = `${singular}s`): string =>
  `${count} ${count === 1 ? singular : plural}`;

const houseLabel = (entry: PracticeRecapHousePointEntry): string =>
  `${entry.houseEmoji ? `${entry.houseEmoji} ` : ""}${entry.houseName}`;

const formatRewardSummary = (recap: PracticeRecap): string => {
  if (recap.rewards.rewardedCount === 0) {
    return "- Attendance XP: none recorded for this session";
  }

  if (recap.rewards.xpPerMember) {
    return `- Attendance XP: ${recap.rewards.rewardedCount} members x ${recap.rewards.xpPerMember} XP = ${recap.rewards.totalXpAwarded} XP total`;
  }

  return `- Attendance XP: ${recap.rewards.rewardedCount} members rewarded, ${recap.rewards.totalXpAwarded} XP total recorded`;
};

const formatHousePointRows = (
  entries: PracticeRecapHousePointEntry[]
): string[] => {
  if (entries.length === 0) {
    return ["- No House practice points recorded for this session."];
  }

  const visibleEntries = entries.slice(0, MAX_HOUSE_POINT_ROWS);

  return [
    ...visibleEntries.map(
      (entry) => `- ${houseLabel(entry)}: +${entry.points} point${entry.points === 1 ? "" : "s"}`
    ),
    entries.length > visibleEntries.length
      ? "- Showing the top House point rows only."
      : null
  ].filter(Boolean) as string[];
};

const formatStreakRows = (
  highlights: PracticeRecapStreakHighlight[]
): string[] => {
  const visibleHighlights = highlights.slice(0, MAX_STREAK_ROWS);

  return visibleHighlights.map(
    (highlight) =>
      `- <@${highlight.userId}> - ${highlight.currentStreak}-practice streak`
  );
};

export const formatNoPracticeRecapMessage = (): string =>
  "No completed practice session is available for a recap yet.";

export const formatPracticeRecapMessage = (recap: PracticeRecap): string => {
  const lines = [
    `Practice Recap - ${recap.sessionLabel}`,
    "",
    "Attendance",
    `- Attended: ${recap.attendance.attended}`,
    `- Not Here: ${recap.attendance.notHere}`,
    `- No Response: ${recap.attendance.noResponse}`,
    `- Tracked responses: ${recap.attendance.trackedResponses}`,
    "",
    "Rewards",
    formatRewardSummary(recap),
    "",
    "House Points",
    ...formatHousePointRows(recap.housePoints)
  ];

  if (recap.streakHighlights.length > 0) {
    lines.push("", "Streak Highlights", ...formatStreakRows(recap.streakHighlights));
  }

  if (recap.attendance.trackedResponses === 0) {
    lines.push("", "No attendance responses were recorded for this practice.");
  }

  lines.push(
    "",
    `${pluralize(recap.attendance.attended, "member")} attended this practice.`
  );

  return lines.join("\n");
};

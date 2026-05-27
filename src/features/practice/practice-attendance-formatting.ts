import {
  getPracticeAttendanceStatusLabel,
  type PracticeAttendanceHistoryEntry,
  type PracticeAttendanceLeaderboardEntry,
  type PracticeAttendancePeriod,
  type PracticeAttendanceStreaks,
  type PracticeAttendanceSummary,
  type PracticeAttendanceWindow
} from "./practice-attendance.service.js";

const DISCORD_MESSAGE_LIMIT = 2000;
const MAX_HISTORY_ROWS = 20;

const formatDate = (date: Date): string =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);

const formatPracticeCount = (count: number): string =>
  `${count} practice${count === 1 ? "" : "s"}`;

const formatSummaryLines = (summary: PracticeAttendanceSummary): string[] => [
  "Summary:",
  `- Attended: ${summary.attended}`,
  `- Not Here: ${summary.notHere}`,
  `- No Response: ${summary.noResponse}`
];

export const parsePracticeAttendancePeriod = (
  value: string | null
): PracticeAttendancePeriod => {
  if (
    value === "last_30_days" ||
    value === "all_time" ||
    value === "current_month"
  ) {
    return value;
  }

  return "current_month";
};

export const formatPracticeAttendanceHistoryMessage = (input: {
  displayName: string;
  entries: PracticeAttendanceHistoryEntry[];
  summary: PracticeAttendanceSummary;
  limit: number;
}): string => {
  if (input.entries.length === 0) {
    return `${input.displayName} has no completed practice attendance history yet.`;
  }

  const visibleEntries = input.entries.slice(0, MAX_HISTORY_ROWS);
  const lines = [
    `Practice History for ${input.displayName}`,
    "",
    "Recent Practices:",
    ...visibleEntries.map((entry, index) => {
      const status = getPracticeAttendanceStatusLabel(entry.status);
      const reward =
        entry.rewardXp > 0 ? ` - ${entry.rewardXp} XP awarded` : "";

      return `${index + 1}. ${formatDate(entry.practiceDate)} - ${status}${reward}`;
    }),
    input.entries.length > visibleEntries.length
      ? "Showing fewer practices to keep this readable."
      : null,
    "",
    ...formatSummaryLines(input.summary)
  ].filter(Boolean);
  const message = lines.join("\n");

  if (message.length <= DISCORD_MESSAGE_LIMIT) {
    return message;
  }

  return [
    `Practice History for ${input.displayName}`,
    "",
    "Recent Practices:",
    ...input.entries.slice(0, Math.min(input.limit, 8)).map((entry, index) => {
      const status = getPracticeAttendanceStatusLabel(entry.status);

      return `${index + 1}. ${formatDate(entry.practiceDate)} - ${status}`;
    }),
    "",
    "Showing fewer practices to keep this readable.",
    "",
    ...formatSummaryLines(input.summary)
  ].join("\n");
};

export const formatPracticeAttendanceLeaderboardMessage = (input: {
  entries: PracticeAttendanceLeaderboardEntry[];
  window: PracticeAttendanceWindow;
}): string => {
  if (input.entries.length === 0) {
    return `No attended practices are recorded for ${input.window.label}.`;
  }

  return [
    `Practice Leaderboard - ${input.window.label}`,
    ...input.entries.map(
      (entry) =>
        `${entry.rank}. <@${entry.userId}> - ${formatPracticeCount(entry.attendedCount)}`
    )
  ].join("\n");
};

export const formatPracticeStreaksMessage = (input: {
  displayName: string;
  streaks: PracticeAttendanceStreaks;
}): string => {
  if (input.streaks.totalAttended === 0) {
    return `${input.displayName} has no attended practices recorded yet.`;
  }

  return [
    `Practice Streaks for ${input.displayName}`,
    "",
    `- Current streak: ${formatPracticeCount(input.streaks.currentStreak)}`,
    `- Longest streak: ${formatPracticeCount(input.streaks.longestStreak)}`,
    `- Total attended: ${formatPracticeCount(input.streaks.totalAttended)}`,
    `- Attended this month: ${formatPracticeCount(input.streaks.attendedInCurrentMonth)}`,
    input.streaks.lastAttendedAt
      ? `- Last attended: ${formatDate(input.streaks.lastAttendedAt)}`
      : "- Last attended: none"
  ].join("\n");
};

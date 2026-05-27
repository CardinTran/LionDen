import type {
  HouseRecapCategoryWinner,
  HouseRecapConfigRecord,
  HouseRecapStatus,
  HouseRecapSourceBreakdown,
  WeeklyHouseRecap
} from "./house-recap.service.js";
import type {
  HousePointSourceTypeValue,
  HouseRecord
} from "./house.service.js";

const DISCORD_MESSAGE_LIMIT = 2000;

const SOURCE_LABELS: Record<HousePointSourceTypeValue, string> = {
  PRACTICE_ATTENDANCE: "Practice",
  WEEKLY_CHALLENGE: "Weekly Challenges",
  RED_ENVELOPE_CLAIM: "Red Envelopes",
  LION_CATCH: "Lion Catches",
  LION_TRAINING: "Lion Training",
  TRAINING_BATTLE: "Training Hall Battles",
  DUEL_COMPLETION: "Duels",
  MESSAGE_ACTIVITY: "Message Activity",
  ADMIN_ADJUSTMENT: "Admin Adjustments"
};

const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];

const formatPoints = (points: number): string =>
  `${points} pt${Math.abs(points) === 1 ? "" : "s"}`;

const formatHouseName = (house: HouseRecord): string =>
  `${house.emoji ? `${house.emoji} ` : ""}${house.name}`;

const formatSourceBreakdown = (
  breakdown: Partial<Record<HousePointSourceTypeValue, number>>
): string => {
  const entries = Object.entries(breakdown)
    .filter(([, points]) => points !== 0)
    .map(
      ([sourceType, points]) =>
        `${SOURCE_LABELS[sourceType as HousePointSourceTypeValue]} ${points}`
    );

  return entries.length > 0 ? ` (${entries.join(", ")})` : "";
};

const formatCategoryWinner = (winner: HouseRecapCategoryWinner): string =>
  winner.house
    ? `- ${winner.label}: ${formatHouseName(winner.house)} (${formatPoints(winner.points)})`
    : `- ${winner.label}: No points yet`;

export const formatHouseRecapSchedule = (
  config: Pick<
    HouseRecapConfigRecord,
    "weekday" | "hour" | "minute" | "timezone"
  >
): string =>
  `${WEEKDAY_LABELS[config.weekday] ?? `Day ${config.weekday}`} at ${String(config.hour).padStart(2, "0")}:${String(config.minute).padStart(2, "0")} ${config.timezone}`;

export const formatWeeklyHouseRecap = (recap: WeeklyHouseRecap): string => {
  const lines = ["House Cup Weekly Recap", "", `Week: ${recap.weekKey}`];

  if (!recap.hasHouses) {
    lines.push(
      "",
      "No active Houses are configured yet.",
      "Use `/houseadmin create` to set up Team Houses before weekly recaps become competitive."
    );
    return lines.join("\n");
  }

  lines.push("", "Standings");

  if (!recap.hasPoints) {
    lines.push("No House points were earned this week yet.");
  } else {
    for (const standing of recap.standings.slice(0, 10)) {
      lines.push(
        `${standing.rank}. ${formatHouseName(standing.house)} - ${formatPoints(standing.points)}`
      );
    }
  }

  lines.push("", "Top Contributors");

  if (recap.topContributors.length === 0) {
    lines.push("No individual contributors yet.");
  } else {
    for (const contributor of recap.topContributors.slice(0, 5)) {
      lines.push(
        `${contributor.rank}. <@${contributor.userId}> - ${formatPoints(contributor.points)}${formatSourceBreakdown(contributor.sourceBreakdown)}`
      );
    }
  }

  lines.push("", "Highlights");

  for (const winner of recap.categoryWinners) {
    lines.push(formatCategoryWinner(winner));
  }

  lines.push("", "Point Breakdown");

  if (recap.sourceBreakdown.length === 0) {
    lines.push("No point sources recorded this week.");
  } else {
    for (const entry of recap.sourceBreakdown.slice(0, 8)) {
      lines.push(
        `- ${SOURCE_LABELS[entry.sourceType]}: ${formatPoints(entry.points)}`
      );
    }
  }

  const message = lines.join("\n");

  if (message.length <= DISCORD_MESSAGE_LIMIT) {
    return message;
  }

  return [
    ...lines.slice(0, 40),
    "",
    "Only top entries are shown to keep this recap readable."
  ].join("\n");
};

export const formatHouseRecapConfiguredMessage = (
  config: HouseRecapConfigRecord
): string =>
  `Weekly House Recap enabled in <#${config.channelId}> every ${formatHouseRecapSchedule(config)}.`;

export const formatHouseRecapDisabledMessage = (
  config: HouseRecapConfigRecord | null
): string =>
  config
    ? "Weekly House Recap disabled. Existing config and post history were kept."
    : "No Weekly House Recap config exists yet.";

export const formatHouseRecapStatusMessage = (
  status: HouseRecapStatus
): string => {
  const lines = [
    "Weekly House Recap Status",
    "",
    `Current week: ${status.weekKey}`
  ];

  if (!status.config) {
    lines.push("Config: not configured");
  } else {
    lines.push(
      `Config: ${status.config.isEnabled ? "enabled" : "disabled"}`,
      `Channel: ${status.config.channelId ? `<#${status.config.channelId}>` : "not set"}`,
      `Schedule: ${formatHouseRecapSchedule(status.config)}`
    );
  }

  lines.push(
    `Current week posted: ${status.alreadyPosted ? "yes" : "no"}`,
    status.lastPost
      ? `Last post: ${status.lastPost.weekKey} in <#${status.lastPost.channelId}>`
      : "Last post: none"
  );

  return lines.join("\n");
};

export const formatHouseRecapPostResultMessage = (input: {
  outcome: "posted" | "posted_unrecorded" | "skipped_duplicate";
  weekKey: string;
  channelId?: string | null;
}): string => {
  if (input.outcome === "skipped_duplicate") {
    return `Skipped Weekly House Recap for ${input.weekKey}; it has already been posted. Use force if you need a manual repost.`;
  }

  if (input.outcome === "posted_unrecorded") {
    return `Posted Weekly House Recap for ${input.weekKey} to <#${input.channelId}>, but recording the post failed. Check logs before retrying.`;
  }

  return `Posted Weekly House Recap for ${input.weekKey} to <#${input.channelId}>.`;
};

export const getSourceLabel = (sourceType: HousePointSourceTypeValue): string =>
  SOURCE_LABELS[sourceType];

export const formatBreakdownLine = (entry: HouseRecapSourceBreakdown): string =>
  `${SOURCE_LABELS[entry.sourceType]}: ${formatPoints(entry.points)}`;

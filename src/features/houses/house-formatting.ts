import type {
  CreateHouseResult,
  HouseLeaderboardEntry,
  HouseMembershipResult,
  HousePointResult,
  HouseRecord,
  UpdateHouseResult,
  UserHouseProfile
} from "./house.service.js";
import type { UserHouseBadgeViewEntry } from "./house-achievement.service.js";
import { formatRecentHouseBadgesSummary } from "./house-achievement-formatting.js";

const houseLabel = (house: HouseRecord): string =>
  `${house.emoji ? `${house.emoji} ` : ""}${house.name} \`${house.houseKey}\``;

export const formatHouseJoinMessage = (
  result: HouseMembershipResult
): string => {
  switch (result.outcome) {
    case "joined":
      return `You joined ${houseLabel(result.house!)}.`;
    case "already_member":
      return `You are already in ${houseLabel(result.house!)}.`;
    case "member_of_other_house":
      return `You are already in ${result.previousHouse ? houseLabel(result.previousHouse) : "another House"}. Leave it before joining ${houseLabel(result.house!)}.`;
    case "house_inactive":
      return `${houseLabel(result.house!)} is inactive and cannot be joined.`;
    case "house_not_found":
      return "I could not find that active House.";
    default:
      return "That House join could not be completed.";
  }
};

export const formatHouseLeaveMessage = (
  result: HouseMembershipResult
): string =>
  result.outcome === "left"
    ? `You left ${result.house ? houseLabel(result.house) : "your House"}.`
    : "You are not currently in a House.";

export const formatHouseProfileMessage = (input: {
  displayName: string;
  profile: UserHouseProfile;
  recentBadges?: UserHouseBadgeViewEntry[];
}): string => {
  if (!input.profile.house) {
    return `${input.displayName} is not in a House yet.`;
  }

  const description = input.profile.house.description
    ? `Description: ${input.profile.house.description}`
    : "Description: none";

  return [
    `${input.displayName}'s House profile`,
    `House: ${houseLabel(input.profile.house)}`,
    description,
    `This week: ${input.profile.weekPoints} points`,
    `Lifetime: ${input.profile.lifetimePoints} points`,
    input.recentBadges
      ? formatRecentHouseBadgesSummary(input.recentBadges)
      : null
  ]
    .filter(Boolean)
    .join("\n");
};

export const formatHouseLeaderboardMessage = (
  entries: HouseLeaderboardEntry[]
): string => {
  if (entries.length === 0) {
    return "No active Houses are configured yet.";
  }

  const hasPoints = entries.some((entry) => entry.points !== 0);

  return [
    "House Cup standings",
    ...entries.map(
      (entry, index) =>
        `${index + 1}. ${houseLabel(entry.house)} - ${entry.points} points`
    ),
    hasPoints ? null : "No House points have been recorded yet."
  ]
    .filter(Boolean)
    .join("\n");
};

export const formatHouseRosterMessage = (input: {
  house: HouseRecord | null;
  userIds: string[];
}): string => {
  if (!input.house) {
    return "I could not find that House.";
  }

  if (input.userIds.length === 0) {
    return `${houseLabel(input.house)} has no members yet.`;
  }

  return [
    `${houseLabel(input.house)} roster`,
    ...input.userIds.map((userId) => `- <@${userId}>`)
  ].join("\n");
};

export const formatHouseCreateMessage = (result: CreateHouseResult): string => {
  if (result.outcome === "created") {
    return `Created ${houseLabel(result.house)}.`;
  }

  if (result.outcome === "duplicate_key") {
    return `${houseLabel(result.house)} already uses that House key.`;
  }

  return "House key must contain at least one letter or number.";
};

export const formatHouseAdminMembershipMessage = (input: {
  action: "assign" | "remove";
  targetName: string;
  result: HouseMembershipResult;
}): string => {
  const result = input.result;

  if (input.action === "assign") {
    if (result.outcome === "assigned") {
      return result.previousHouse
        ? `${input.targetName} moved from ${houseLabel(result.previousHouse)} to ${houseLabel(result.house!)}.`
        : `${input.targetName} assigned to ${houseLabel(result.house!)}.`;
    }

    if (result.outcome === "already_member") {
      return `${input.targetName} is already in ${houseLabel(result.house!)}.`;
    }

    if (result.outcome === "house_inactive") {
      return `${houseLabel(result.house!)} is inactive and cannot receive new members.`;
    }

    return "I could not find that House.";
  }

  if (result.outcome === "removed") {
    return `${input.targetName} was removed from ${result.house ? houseLabel(result.house) : "their House"}.`;
  }

  return `${input.targetName} is not currently in a House.`;
};

export const formatHouseUpdateMessage = (
  result: UpdateHouseResult,
  action: "rename" | "deactivate"
): string => {
  if (result.outcome !== "updated") {
    return "I could not find that House.";
  }

  return action === "rename"
    ? `Updated ${houseLabel(result.house)}.`
    : `${houseLabel(result.house)} is now inactive.`;
};

export const formatHousePointAdjustmentMessage = (input: {
  result: HousePointResult;
  points: number;
}): string => {
  if (input.result.outcome !== "recorded") {
    return "I could not record that House point adjustment.";
  }

  return `${input.points >= 0 ? "Added" : "Removed"} ${Math.abs(input.points)} House point${Math.abs(input.points) === 1 ? "" : "s"} for ${houseLabel(input.result.house)}.`;
};

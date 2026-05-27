import {
  getOwnedLionDisplayName,
  type UserLionWithSpeciesRecord
} from "./lion-creature.service.js";
import {
  getBondMood,
  getBondProgress,
  type LionBondStatusResult,
  type LionCareResult
} from "./lion-bond.service.js";

export const formatLionBondCooldown = (
  cooldownEndsAt: Date | null,
  now: Date = new Date()
): string => {
  if (!cooldownEndsAt || cooldownEndsAt.getTime() <= now.getTime()) {
    return "ready";
  }

  const totalMinutes = Math.max(
    1,
    Math.ceil((cooldownEndsAt.getTime() - now.getTime()) / 60_000)
  );
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  return `${minutes}m`;
};

export const formatLionBondCompactSummary = (
  lion: UserLionWithSpeciesRecord
): string => {
  const progress = getBondProgress(lion.bondXp ?? 0);

  return `Bond: Level ${progress.level} - ${getBondMood(progress.level)}`;
};

const formatBondProgressLine = (bondXp: number): string => {
  const progress = getBondProgress(bondXp);

  return progress.nextLevelXp === null
    ? `Progress: ${progress.bondXp} XP (max bond level)`
    : `Progress: ${progress.bondXp} / ${progress.nextLevelXp} XP`;
};

const formatBondNoFavoriteMessage = (command: string): string =>
  `Use \`${command} <lion>\` or set a favorite first with \`~favorite <lion>\`.`;

export const formatLionBondStatusMessage = (
  result: LionBondStatusResult,
  now: Date = new Date()
): string => {
  if (result.outcome === "no_favorite") {
    return formatBondNoFavoriteMessage("~bond");
  }

  if (result.outcome === "no_lions") {
    return "You have not caught any lions yet. Catch one with `~catch <ball>` first.";
  }

  if (result.outcome === "lion_not_found") {
    return `I could not find \`${result.failedQuery ?? "that lion"}\` in your roster. Try \`~lions\` to see your owned IDs.`;
  }

  if (result.outcome !== "status") {
    return "That lion's bond could not be shown right now.";
  }

  return [
    `${getOwnedLionDisplayName(result.status.lion)} - Bond Level ${result.status.progress.level}`,
    formatBondProgressLine(result.status.progress.bondXp),
    `Mood: ${result.status.mood}`,
    "Care:",
    `- Feed: ${formatLionBondCooldown(result.status.feedCooldownEndsAt, now)}`,
    `- Groom: ${formatLionBondCooldown(result.status.groomCooldownEndsAt, now)}`
  ].join("\n");
};

const getCareVerb = (action: LionCareResult["action"]): string =>
  action === "feed" ? "fed" : "groomed";

const getCareSuccessLine = (result: Extract<LionCareResult, { outcome: "cared" }>): string =>
  result.action === "feed"
    ? `${getOwnedLionDisplayName(result.status.lion)} enjoyed the meal.`
    : `${getOwnedLionDisplayName(result.status.lion)} looks parade-ready.`;

export const formatLionCareResultMessage = (
  result: LionCareResult,
  now: Date = new Date()
): string => {
  const command = result.action === "feed" ? "~feed" : "~groom";

  if (result.outcome === "no_favorite") {
    return formatBondNoFavoriteMessage(command);
  }

  if (result.outcome === "no_lions") {
    return "You have not caught any lions yet. Catch one with `~catch <ball>` first.";
  }

  if (result.outcome === "lion_not_found") {
    return `I could not find \`${result.failedQuery ?? "that lion"}\` in your roster. Try \`~lions\` to see your owned IDs.`;
  }

  if (result.outcome === "on_cooldown") {
    return `${getOwnedLionDisplayName(result.status.lion)} was already ${getCareVerb(result.action)} recently. Try again in ${formatLionBondCooldown(result.cooldownEndsAt, now)}.`;
  }

  if (result.outcome !== "cared") {
    return "That care action could not be completed right now.";
  }

  return [
    getCareSuccessLine(result),
    `Bond +${result.gainedBondXp} XP.`,
    result.leveledUp
      ? `${getOwnedLionDisplayName(result.status.lion)} grew closer to you.`
      : null,
    result.leveledUp
      ? `Bond Level Up: ${result.previousLevel} -> ${result.nextLevel}`
      : `Bond Level: ${result.nextLevel}`,
    formatBondProgressLine(result.status.progress.bondXp),
    `Mood: ${result.status.mood}`
  ]
    .filter(Boolean)
    .join("\n");
};

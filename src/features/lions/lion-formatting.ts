import type {
  ActiveLionSpawnWithSpeciesRecord,
  AwardBattleLionExperienceResult,
  LionExperienceAwardResult,
  LionShopItemRecord,
  SetUserLionTeamResult,
  TopLionBoardEntry,
  TrainUserLionResult,
  UserItemInventoryRecord,
  UserLionTeamSlotWithLionRecord,
  UserLionWithSpeciesRecord
} from "./lion-creature.service.js";
import type {
  LionAutoBattleResult,
  LionTeamAutoBattleResult
} from "./lion-battle.service.js";
import {
  deriveLionStats,
  getLionExperienceProgress
} from "./lion-progression.service.js";

export const formatDiscordTimestamp = (
  date: Date,
  style: "R" | "t" = "R"
): string => `<t:${Math.floor(date.getTime() / 1000)}:${style}>`;

export const formatWildLionSpawnMessage = (input: {
  spawn: ActiveLionSpawnWithSpeciesRecord;
}): string =>
  [
    `A wild Lv. ${input.spawn.level} ${input.spawn.species.name} appeared in <#${input.spawn.channelId}>.`,
    `Code: \`${input.spawn.species.publicId}\` | Slug: \`${input.spawn.species.slug}\``,
    `Rarity: ${input.spawn.species.rarity} | Type: ${input.spawn.species.primaryType}`,
    `Catch it with \`~catch basic-ball\`, \`~catch great-ball\`, or \`~catch ultra-ball\`.`,
    `It leaves ${formatDiscordTimestamp(input.spawn.expiresAt)}.`
  ].join("\n");

export const formatLionShopMessage = (items: LionShopItemRecord[]): string => {
  if (items.length === 0) {
    return "The lion shop is empty right now.";
  }

  return [
    "LionDen shop items:",
    ...items.map(
      (item) =>
        `- ${item.name} (\`${item.itemKey}\`) - ${item.priceCoins} coins - ${item.description}`
    ),
    "Buy with `~buy <item> [quantity]`.",
    "Use balls with `~catch <ball>` and lures with `~use <item>`."
  ].join("\n");
};

export const formatLionInventoryMessage = (input: {
  inventory: UserItemInventoryRecord[];
}): string => {
  const visibleInventory = input.inventory.filter((item) => item.quantity > 0);

  if (visibleInventory.length === 0) {
    return "Your lion item bag is empty. Use `~shop` to see what you can buy.";
  }

  return [
    "Your lion item bag:",
    ...visibleInventory.map((item) => `- \`${item.itemKey}\`: ${item.quantity}`)
  ].join("\n");
};

export const formatLionHelpMessage = (): string =>
  [
    "LionDen lion help",
    "Public commands:",
    "- `~shop` view lion items",
    "- `~buy <item> [quantity]` buy items",
    "- `~bag` view your items",
    "- `~use <item>` activate a usable item in the current channel",
    "- `~catch <ball>` catch a wild lion",
    "- `~train <lion>` train one of your lions for XP",
    "- `~team` view your battle team",
    "- `~team set <lion1> <lion2> <lion3>` set up to 3 team slots",
    "- `~team clear` clear your battle team",
    "- `~battle @user` battle using both saved teams",
    "- `~toplions` view the strongest lions in this server",
    "- `~lions` view your roster",
    "- `~lion <id or name>` inspect one lion",
    "- `~wild` view active wild lions",
    "Start here: buy balls with `~buy basic-ball 3`, wait for wild lions, catch them, train them, set a team, then battle."
  ].join("\n");

const formatCompactLionLine = (
  lion: UserLionWithSpeciesRecord,
  prefix: string
): string => {
  const stats = deriveLionStats(lion.species, lion.level);

  return `${prefix}${lion.species.name} \`${lion.species.publicId}\` - Lv. ${lion.level} - ${stats.hp} HP/${stats.attack} ATK - Lion ID: \`${lion.id.slice(0, 8)}\``;
};

export const formatUserLionsMessage = (input: {
  lions: UserLionWithSpeciesRecord[];
  displayName: string;
  team?: UserLionTeamSlotWithLionRecord[];
}): string => {
  if (input.lions.length === 0) {
    return `${input.displayName} has not caught any lions yet.`;
  }

  const teamSlotByLionId = new Map(
    input.team?.map((slot) => [slot.userLionId, slot.slot]) ?? []
  );

  return [
    `${input.displayName}'s lions:`,
    ...input.lions.map((lion, index) => {
      const teamSlot = teamSlotByLionId.get(lion.id);
      const teamLabel = teamSlot ? ` - team slot ${teamSlot}` : "";

      return `${formatCompactLionLine(lion, `${index + 1}. `)} (${lion.species.rarity})${teamLabel}`;
    })
  ].join("\n");
};

export const formatUserLionTeamMessage = (input: {
  team: UserLionTeamSlotWithLionRecord[];
  displayName: string;
}): string => {
  if (input.team.length === 0) {
    return `${input.displayName} has no battle team set. Use \`~team set <lion1> <lion2> <lion3>\`.`;
  }

  return [
    `${input.displayName}'s battle team:`,
    ...input.team.map((slot) =>
      formatCompactLionLine(slot.lion, `${slot.slot}. `)
    ),
    input.team.length < 3
      ? "This team can battle now, but a full team can hold up to 3 lions."
      : "Full team ready."
  ].join("\n");
};

export const formatSetUserLionTeamMessage = (
  result: SetUserLionTeamResult
): string => {
  if (result.outcome === "empty_team") {
    return "Use `~team set <lion1> <lion2> <lion3>` with at least one owned lion.";
  }

  if (result.outcome === "too_many_lions") {
    return "A battle team can have at most 3 lions.";
  }

  if (result.outcome === "lion_not_found") {
    return `I could not find \`${result.failedQuery ?? "that lion"}\` in your roster. Use \`~lions\` to check your owned IDs.`;
  }

  if (result.outcome === "duplicate_lion") {
    return `\`${result.failedQuery ?? "That lion"}\` is already on this team. Each team slot needs a different owned lion.`;
  }

  return [
    "Battle team updated:",
    ...result.team.map((slot) =>
      formatCompactLionLine(slot.lion, `${slot.slot}. `)
    )
  ].join("\n");
};

export const formatClearUserLionTeamMessage = (clearedCount: number): string =>
  clearedCount === 0
    ? "Your battle team was already empty."
    : "Your battle team has been cleared.";

export const formatOwnedLionMessage = (
  lion: UserLionWithSpeciesRecord,
  ownerDisplayName?: string
): string => {
  const stats = deriveLionStats(lion.species, lion.level);
  const progress = getLionExperienceProgress(lion.experience);

  return [
    `${lion.species.name} \`${lion.species.publicId}\``,
    ownerDisplayName ? `Owner: ${ownerDisplayName}` : null,
    `Slug: \`${lion.species.slug}\` | Lion ID: \`${lion.id.slice(0, 8)}\``,
    `Rarity: ${lion.species.rarity}`,
    `Type: ${lion.species.primaryType}${lion.species.secondaryType ? ` / ${lion.species.secondaryType}` : ""}`,
    `Ability: ${lion.species.abilityName}`,
    `Passive: ${lion.species.abilityDescription}`,
    `Level: ${lion.level}`,
    `XP: ${lion.experience} (${progress.xpNeededForNextLevel} to next level)`,
    `Stats: ${stats.hp} HP | ${stats.attack} ATK | ${stats.defense} DEF | ${stats.speed} SPD`,
    `Caught: ${formatDiscordTimestamp(lion.acquiredAt, "t")}`,
    lion.species.description
  ]
    .filter(Boolean)
    .join("\n");
};

const formatExperienceAwardLine = (
  result: LionExperienceAwardResult | null
): string => {
  if (!result) {
    return "No XP awarded.";
  }

  return result.leveledUp
    ? `+${result.gainedExperience} XP, leveled from ${result.previousLevel} to ${result.nextLevel}.`
    : `+${result.gainedExperience} XP, now level ${result.nextLevel}.`;
};

export const formatTrainLionMessage = (input: {
  result: TrainUserLionResult;
}): string => {
  if (input.result.outcome === "lion_not_found") {
    return "I could not find that lion in your roster. Try `~lions` to see your owned IDs.";
  }

  if (input.result.outcome === "on_cooldown" && input.result.cooldownEndsAt) {
    return `That lion already trained recently. Try again ${formatDiscordTimestamp(input.result.cooldownEndsAt)}.`;
  }

  const lion = input.result.result?.lion;

  if (!lion) {
    return "That lion could not train right now.";
  }

  return [
    `${lion.species.name} \`${lion.species.publicId}\` finished training.`,
    formatExperienceAwardLine(input.result.result),
    `Next training available ${input.result.cooldownEndsAt ? formatDiscordTimestamp(input.result.cooldownEndsAt) : "later"}.`
  ].join("\n");
};

export const formatBattleLionMessage = (input: {
  battle: LionAutoBattleResult;
  winnerXp: AwardBattleLionExperienceResult;
  loserXp: AwardBattleLionExperienceResult;
}): string => {
  const notableRounds = input.battle.rounds.slice(0, 6).map((round) => {
    const effectiveness =
      round.effectiveness > 1
        ? "super effective"
        : round.effectiveness < 1
          ? "not very effective"
          : "normal";

    return `- R${round.round}: ${round.attackerName} used ${round.move.name} for ${round.damage} damage (${effectiveness}). ${round.defenderName}: ${round.defenderHpAfter} HP`;
  });
  const winnerHp = input.battle.finalHp[input.battle.winner.id] ?? 0;
  const loserHp = input.battle.finalHp[input.battle.loser.id] ?? 0;
  const winnerXpLine =
    input.winnerXp.outcome === "awarded"
      ? formatExperienceAwardLine(input.winnerXp.result)
      : `No winner XP awarded; battle XP cooldown ends ${input.winnerXp.cooldownEndsAt ? formatDiscordTimestamp(input.winnerXp.cooldownEndsAt) : "later"}.`;
  const loserXpLine =
    input.loserXp.outcome === "awarded"
      ? formatExperienceAwardLine(input.loserXp.result)
      : `No participation XP awarded; battle XP cooldown ends ${input.loserXp.cooldownEndsAt ? formatDiscordTimestamp(input.loserXp.cooldownEndsAt) : "later"}.`;

  return [
    `${input.battle.winner.species.name} \`${input.battle.winner.species.publicId}\` won the battle.`,
    `Final HP: winner ${winnerHp}, loser ${loserHp}.`,
    ...notableRounds,
    `Winner XP: ${winnerXpLine}`,
    `Participation XP: ${loserXpLine}`
  ].join("\n");
};

const formatBattleXpSummary = (
  rewards: AwardBattleLionExperienceResult[]
): string => {
  if (rewards.length === 0) {
    return "No participating lions.";
  }

  const awarded = rewards.filter((reward) => reward.outcome === "awarded");
  const levelUps = awarded
    .filter((reward) => reward.result?.leveledUp)
    .map(
      (reward) =>
        `${reward.result?.lion.species.name ?? "A lion"} to Lv. ${reward.result?.nextLevel ?? "?"}`
    );
  const cooldownCount = rewards.length - awarded.length;

  return [
    `${awarded.length}/${rewards.length} awarded XP`,
    cooldownCount > 0 ? `${cooldownCount} on cooldown` : null,
    levelUps.length > 0 ? `Level ups: ${levelUps.join(", ")}` : null
  ]
    .filter(Boolean)
    .join(" | ");
};

const getTeamRemainingHp = (
  team: UserLionWithSpeciesRecord[],
  finalHp: Record<string, number>
): number =>
  team.reduce((total, lion) => total + Math.max(0, finalHp[lion.id] ?? 0), 0);

export const formatTeamBattleLionMessage = (input: {
  battle: LionTeamAutoBattleResult;
  firstDisplayName: string;
  secondDisplayName: string;
  winnerRewards: AwardBattleLionExperienceResult[];
  loserRewards: AwardBattleLionExperienceResult[];
}): string => {
  const winnerName =
    input.battle.winnerSide === "first"
      ? input.firstDisplayName
      : input.secondDisplayName;
  const loserName =
    input.battle.loserSide === "first"
      ? input.firstDisplayName
      : input.secondDisplayName;
  const firstHp = getTeamRemainingHp(
    input.battle.firstTeam,
    input.battle.finalHp
  );
  const secondHp = getTeamRemainingHp(
    input.battle.secondTeam,
    input.battle.finalHp
  );
  const notableRounds = input.battle.rounds.slice(0, 8).map((round) => {
    const effectiveness =
      round.effectiveness > 1
        ? "super effective"
        : round.effectiveness < 1
          ? "not very effective"
          : "normal";

    return `- R${round.round}: ${round.attackerName} used ${round.move.name} for ${round.damage} damage (${effectiveness}). ${round.defenderName}: ${round.defenderHpAfter} HP`;
  });
  const hiddenRounds = input.battle.rounds.length - notableRounds.length;

  return [
    `${winnerName}'s team defeated ${loserName}'s team.`,
    `Team HP remaining: ${input.firstDisplayName} ${firstHp}, ${input.secondDisplayName} ${secondHp}.`,
    ...notableRounds,
    hiddenRounds > 0
      ? `- ${hiddenRounds} more battle action${hiddenRounds === 1 ? "" : "s"} resolved.`
      : null,
    `Winner team XP: ${formatBattleXpSummary(input.winnerRewards)}`,
    `Other team XP: ${formatBattleXpSummary(input.loserRewards)}`
  ]
    .filter(Boolean)
    .join("\n");
};

export const formatWildLionStatusMessage = (
  spawns: ActiveLionSpawnWithSpeciesRecord[]
): string => {
  if (spawns.length === 0) {
    return "There are no active wild lions right now.";
  }

  return [
    "Active wild lions:",
    ...spawns.map(
      (spawn) =>
        `- Lv. ${spawn.level} ${spawn.species.name} \`${spawn.species.publicId}\` in <#${spawn.channelId}> until ${formatDiscordTimestamp(spawn.expiresAt)}`
    )
  ].join("\n");
};

export const formatTopLionsMessage = (input: {
  entries: TopLionBoardEntry[];
}): string => {
  if (input.entries.length === 0) {
    return "No lions have been caught in this server yet.";
  }

  return [
    "Top lions in this server:",
    ...input.entries.map((entry) => {
      const stats = deriveLionStats(entry.lion.species, entry.lion.level);

      return `${entry.rank}. ${entry.lion.species.name} \`${entry.lion.species.publicId}\` - Lv. ${entry.lion.level} - ${entry.lion.species.rarity} - ${stats.hp} HP/${stats.attack} ATK/${stats.defense} DEF/${stats.speed} SPD - owner: ${entry.ownerDisplayName}`;
    })
  ].join("\n");
};

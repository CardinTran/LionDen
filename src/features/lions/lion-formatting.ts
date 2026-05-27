import type {
  ActiveLionSpawnWithSpeciesRecord,
  AwardBattleLionExperienceResult,
  LionBattleChallengeRecord,
  LionBattleRecord,
  LionExperienceAwardResult,
  LionShopItemRecord,
  ReleaseUserLionResult,
  LionTrainerBattleStats,
  LionTrainerBattleStatsEntry,
  RecentLionCatchEntry,
  SetUserLionTeamResult,
  SetUserLionNicknameResult,
  TopLionBoardEntry,
  TrainUserLionResult,
  UseLionTrainingItemResult,
  UserItemInventoryRecord,
  UserLionTeamSlotWithLionRecord,
  UserLionWithSpeciesRecord
} from "./lion-creature.service.js";
import type {
  ClearFavoriteLionResult,
  LionShowcase,
  SetFavoriteLionResult,
  ShowcaseOwnedLionResult
} from "./lion-showcase.service.js";
import {
  getOwnedLionDisplayName,
  getOwnedLionShortReference,
  HIGH_LEVEL_WILD_LION_THRESHOLD
} from "./lion-creature.service.js";
import type {
  LionAutoBattleResult,
  LionBattleRound,
  LionTeamAutoBattleResult
} from "./lion-battle.service.js";
import {
  getLionBattleEffectivenessLabel,
  getLionBattleOutcomeSummary,
  getLionTeamBattleOutcomeSummary
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
}): string => {
  const notable =
    input.spawn.level >= HIGH_LEVEL_WILD_LION_THRESHOLD ||
    ["RARE", "EPIC", "LEGENDARY"].includes(input.spawn.species.rarity);

  return [
    notable
      ? `Notable wild spawn: Lv. ${input.spawn.level} ${input.spawn.species.rarity} ${input.spawn.species.name} appeared in <#${input.spawn.channelId}>.`
      : `A wild Lv. ${input.spawn.level} ${input.spawn.species.name} appeared in <#${input.spawn.channelId}>.`,
    `Code: \`${input.spawn.species.publicId}\` | Slug: \`${input.spawn.species.slug}\``,
    `Rarity: ${input.spawn.species.rarity} | Type: ${input.spawn.species.primaryType}`,
    `Catch it with \`~catch basic-ball\`, \`~catch great-ball\`, or \`~catch ultra-ball\`.`,
    `It leaves ${formatDiscordTimestamp(input.spawn.expiresAt)}.`
  ].join("\n");
};

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
    "- `~nickname <lion> <name>` nickname one of your lions",
    "- `~favorite <lion>` set your favorite lion",
    "- `~favorite clear` clear your favorite lion",
    "- `~showcase [lion]` publicly show off one owned lion, or your favorite lion when no lion is provided",
    "- `~release <lion> confirm` release one owned lion for coins",
    "- `~team` view your battle team",
    "- `~team set <lion1> <lion2> <lion3>` set up to 3 team slots",
    "- `~team clear` clear your battle team",
    "- `~duel @user` start a button-based 1v1 prototype duel using each trainer's lead team lion",
    "- `~battle @user` challenge someone using both saved teams",
    "- `~battle accept` accept a pending battle challenge in this channel",
    "- `~battle decline` decline a pending battle challenge in this channel",
    "- `~cancelbattle [@user]` cancel your pending battle challenge",
    "- `~battle training` battle a Training Hall team",
    "- `~battlehistory [@user]` view recent team battles",
    "- `~battlestats [@user]` view trainer battle stats",
    "- `~battleboard` view the top battle trainers",
    "Battle note: team battles currently resolve automatically with round-by-round logs. `~duel` is a lightweight 1v1 prototype and does not affect team battle history yet.",
    "- `~toplions` view the strongest lions in this server",
    "- `~rarecatches` view recent rare or high-level catches",
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

  return `${prefix}${getOwnedLionDisplayName(lion)} \`${lion.species.publicId}\` - Lv. ${lion.level} - ${stats.hp} HP/${stats.attack} ATK - Lion ID: \`${getOwnedLionShortReference(lion)}\``;
};

export const formatUserLionsMessage = (input: {
  lions: UserLionWithSpeciesRecord[];
  displayName: string;
  team?: UserLionTeamSlotWithLionRecord[];
  favoriteLionId?: string | null;
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
      const favoriteLabel = input.favoriteLionId === lion.id ? "[favorite] " : "";

      return `${formatCompactLionLine(lion, `${index + 1}. ${favoriteLabel}`)} (${lion.species.rarity})${teamLabel}`;
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
  ownerDisplayName?: string,
  options: {
    isFavorite?: boolean;
  } = {}
): string => {
  const stats = deriveLionStats(lion.species, lion.level);
  const progress = getLionExperienceProgress(lion.experience);
  const source =
    lion.sourceType === "WILD_CATCH"
      ? "Wild catch"
      : lion.sourceType.replace(/_/g, " ").toLowerCase();

  return [
    `${getOwnedLionDisplayName(lion)} \`${lion.species.publicId}\``,
    ownerDisplayName ? `Owner: ${ownerDisplayName}` : null,
    options.isFavorite ? "Favorite Lion: yes" : null,
    `Slug: \`${lion.species.slug}\` | Lion ID: \`${getOwnedLionShortReference(lion)}\``,
    lion.nickname ? `Nickname: ${lion.nickname}` : null,
    `Rarity: ${lion.species.rarity}`,
    `Type: ${lion.species.primaryType}${lion.species.secondaryType ? ` / ${lion.species.secondaryType}` : ""}`,
    `Ability: ${lion.species.abilityName}`,
    `Passive: ${lion.species.abilityDescription}`,
    `Level: ${lion.level}`,
    `XP: ${lion.experience} (${progress.xpNeededForNextLevel} to next level)`,
    `Stats: ${stats.hp} HP | ${stats.attack} ATK | ${stats.defense} DEF | ${stats.speed} SPD`,
    `Acquired: ${source} ${formatDiscordTimestamp(lion.acquiredAt, "t")}`,
    lion.species.description
  ]
    .filter(Boolean)
    .join("\n");
};

export const formatFavoriteLionSummary = (
  lion: UserLionWithSpeciesRecord | null
): string | null => {
  if (!lion) {
    return null;
  }

  return `Favorite Lion: ${getOwnedLionDisplayName(lion)} - ${lion.species.rarity} ${lion.species.name}, Lv. ${lion.level}`;
};

export const formatSetFavoriteLionMessage = (
  result: SetFavoriteLionResult
): string => {
  if (result.outcome === "no_lions") {
    return "You have not caught any lions yet. Catch one with `~catch <ball>` first.";
  }

  if (result.outcome === "lion_not_found") {
    return "I could not find that lion in your roster. Try `~lions` to see your owned IDs.";
  }

  if (result.outcome === "set") {
    return `${getOwnedLionDisplayName(result.favorite.lion)} is now your favorite lion. Use \`~showcase\` to show it off.`;
  }

  return "That favorite lion could not be set right now.";
};

export const formatClearFavoriteLionMessage = (
  result: ClearFavoriteLionResult
): string =>
  result.outcome === "cleared"
    ? "Your favorite lion has been cleared."
    : "You do not have a favorite lion set yet.";

export const formatLionShowcaseMessage = (
  showcase: LionShowcase
): string => {
  const lion = showcase.lion;
  const stats = deriveLionStats(lion.species, lion.level);
  const progress = getLionExperienceProgress(lion.experience);

  return [
    "Lion Showcase",
    `Owner: <@${showcase.ownerUserId}> (${showcase.ownerDisplayName})`,
    showcase.isFavorite ? "Favorite Lion: yes" : null,
    `Name: ${getOwnedLionDisplayName(lion)}`,
    lion.nickname ? `Nickname: ${lion.nickname}` : null,
    `Species: ${lion.species.name}`,
    `Rarity: ${lion.species.rarity}`,
    `Type: ${lion.species.primaryType}${lion.species.secondaryType ? ` / ${lion.species.secondaryType}` : ""}`,
    `Level: ${lion.level}`,
    `XP: ${lion.experience} (${progress.xpNeededForNextLevel} to next level)`,
    `Stats: ${stats.hp} HP | ${stats.attack} ATK | ${stats.defense} DEF | ${stats.speed} SPD`,
    `Team: ${showcase.teamSlot ? `Slot ${showcase.teamSlot}` : "Not on saved team"}`,
    `Caught: ${formatDiscordTimestamp(lion.acquiredAt, "t")}`,
    `Lion ID: \`${getOwnedLionShortReference(lion)}\` | Code: \`${lion.species.publicId}\``,
    `A proud member of <@${showcase.ownerUserId}>'s den.`
  ]
    .filter(Boolean)
    .join("\n");
};

export const formatShowcaseOwnedLionMessage = (
  result: ShowcaseOwnedLionResult
): string => {
  if (result.outcome === "no_favorite") {
    return "Use `~showcase <lion>` to show one of your lions, or set a favorite first with `~favorite <lion>`.";
  }

  if (result.outcome === "no_lions") {
    return "You have not caught any lions yet. Catch one with `~catch <ball>` first.";
  }

  if (result.outcome === "lion_not_found") {
    return `I could not find \`${result.failedQuery ?? "that lion"}\` in your roster. Try \`~lions\` to see your owned IDs.`;
  }

  if (result.outcome === "showcase") {
    return formatLionShowcaseMessage(result.showcase);
  }

  return "That lion could not be showcased right now.";
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

export const formatReleaseUserLionPreviewMessage = (input: {
  lion: UserLionWithSpeciesRecord;
  coinsAwarded: number;
}): string =>
  [
    `Release preview: ${getOwnedLionDisplayName(input.lion)} \`${input.lion.species.publicId}\` would return ${input.coinsAwarded} coins.`,
    `This permanently removes Lion ID \`${getOwnedLionShortReference(input.lion)}\` from your roster.`,
    `Run \`~release ${getOwnedLionShortReference(input.lion)} confirm\` to release it.`
  ].join("\n");

export const formatReleaseUserLionMessage = (
  result: ReleaseUserLionResult
): string => {
  if (result.outcome === "lion_not_found") {
    return "I could not find that lion in your roster. Try `~lions` to see your owned IDs.";
  }

  if (!result.lion || !result.profile) {
    return "That lion could not be released right now.";
  }

  return [
    `${getOwnedLionDisplayName(result.lion)} \`${result.lion.species.publicId}\` was released.`,
    `You received ${result.coinsAwarded} coins and now have ${result.profile.coins} coins.`
  ].join("\n");
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
    `${getOwnedLionDisplayName(lion)} \`${lion.species.publicId}\` finished training.`,
    formatExperienceAwardLine(input.result.result),
    `Next training available ${input.result.cooldownEndsAt ? formatDiscordTimestamp(input.result.cooldownEndsAt) : "later"}.`
  ].join("\n");
};

export const formatUseLionTrainingItemMessage = (input: {
  result: UseLionTrainingItemResult;
}): string => {
  if (input.result.outcome === "item_not_found") {
    return "That lion item does not exist. Use `~shop` to see items.";
  }

  if (input.result.outcome === "not_training_item") {
    return `${input.result.item?.name ?? "That item"} is not a training item.`;
  }

  if (input.result.outcome === "lion_not_found") {
    return `I could not find \`${input.result.failedQuery ?? "that lion"}\` in your roster.`;
  }

  if (input.result.outcome === "no_item") {
    return `You do not have any \`${input.result.item?.itemKey ?? "that item"}\`.`;
  }

  const lion = input.result.result?.lion;

  if (!lion) {
    return "That training item could not be used right now.";
  }

  return [
    `${lion.species.name} used ${input.result.item?.name ?? "a training item"}.`,
    formatExperienceAwardLine(input.result.result)
  ].join("\n");
};

export const formatSetUserLionNicknameMessage = (
  result: SetUserLionNicknameResult
): string => {
  if (result.outcome === "lion_not_found") {
    return "I could not find that lion in your roster. Try `~lions` to see your owned IDs.";
  }

  if (result.outcome === "invalid") {
    return result.error ?? "That nickname is not allowed.";
  }

  if (result.outcome === "cleared") {
    return `${result.lion?.species.name ?? "That lion"} no longer has a nickname.`;
  }

  return `${result.lion?.species.name ?? "That lion"} is now nicknamed ${result.normalizedNickname}.`;
};

export const formatLionBattleChallengeMessage = (
  challenge: LionBattleChallengeRecord
): string =>
  [
    `${challenge.challengerDisplayName} challenged ${challenge.opponentDisplayName} to a lion team battle.`,
    `${challenge.opponentDisplayName} can use \`~battle accept\` to battle or \`~battle decline\` to decline.`,
    `This challenge expires ${formatDiscordTimestamp(challenge.expiresAt)}.`
  ].join("\n");

export const formatExistingLionBattleChallengeMessage = (
  challenge: LionBattleChallengeRecord
): string =>
  `${challenge.challengerDisplayName} already has a pending challenge with ${challenge.opponentDisplayName} until ${formatDiscordTimestamp(challenge.expiresAt)}.`;

export const formatLionBattleChallengeAcceptedMessage = (
  challenge: LionBattleChallengeRecord
): string =>
  `${challenge.opponentDisplayName} accepted ${challenge.challengerDisplayName}'s lion battle challenge.`;

export const formatLionBattleChallengeDeclinedMessage = (
  challenge: LionBattleChallengeRecord
): string =>
  `${challenge.opponentDisplayName} declined ${challenge.challengerDisplayName}'s lion battle challenge.`;

export const formatLionBattleChallengeCanceledMessage = (
  challenge: LionBattleChallengeRecord
): string =>
  `${challenge.challengerDisplayName} canceled the pending lion battle challenge with ${challenge.opponentDisplayName}.`;

const formatEffectivenessMultiplier = (effectiveness: number): string => {
  if (effectiveness === 1) {
    return "";
  }

  return ` x${Number(effectiveness.toFixed(2))}`;
};

const formatBattleRoundMessage = (round: LionBattleRound): string => {
  const effectivenessLabel = getLionBattleEffectivenessLabel(
    round.effectiveness
  );
  const effectiveness =
    effectivenessLabel === "neutral matchup"
      ? effectivenessLabel
      : `${effectivenessLabel}${formatEffectivenessMultiplier(round.effectiveness)}`;

  return `- Round ${round.round}: ${round.attackerName} used ${round.move.name} [${round.move.type}], dealing ${round.damage} damage to ${round.defenderName} (${effectiveness}). ${round.defenderName} HP: ${round.defenderHpAfter}.`;
};

export const formatBattleLionMessage = (input: {
  battle: LionAutoBattleResult;
  winnerXp: AwardBattleLionExperienceResult;
  loserXp: AwardBattleLionExperienceResult;
}): string => {
  const summary = getLionBattleOutcomeSummary(input.battle);
  const notableRounds = input.battle.rounds
    .slice(0, 6)
    .map(formatBattleRoundMessage);
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
    `Final HP: winner ${summary.winnerRemainingHp}, loser ${summary.loserRemainingHp}.`,
    `Why ${input.battle.winner.species.name} won: it kept ${summary.winnerRemainingHp} HP and dealt ${summary.winnerDamageDealt} total damage.`,
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
  const awardedLines = awarded.map(
    (reward) =>
      `${reward.result ? getOwnedLionDisplayName(reward.result.lion) : "A lion"} +${reward.result?.gainedExperience ?? 0} XP${reward.result?.leveledUp ? ` (Lv. ${reward.result.nextLevel})` : ""}`
  );
  const cooldownCount = rewards.length - awarded.length;

  return [
    awardedLines.length > 0
      ? awardedLines.join(", ")
      : `${awarded.length}/${rewards.length} awarded XP`,
    cooldownCount > 0 ? `${cooldownCount} on cooldown` : null
  ]
    .filter(Boolean)
    .join(" | ");
};

export const formatTeamBattleLionMessage = (input: {
  battle: LionTeamAutoBattleResult;
  firstDisplayName: string;
  secondDisplayName: string;
  winnerRewards: AwardBattleLionExperienceResult[];
  loserRewards: AwardBattleLionExperienceResult[];
  mvpLion?: UserLionWithSpeciesRecord | null;
}): string => {
  const winnerName =
    input.battle.winnerSide === "first"
      ? input.firstDisplayName
      : input.secondDisplayName;
  const loserName =
    input.battle.loserSide === "first"
      ? input.firstDisplayName
      : input.secondDisplayName;
  const summary = getLionTeamBattleOutcomeSummary(input.battle);
  const notableRounds = input.battle.rounds
    .slice(0, 8)
    .map(formatBattleRoundMessage);
  const hiddenRounds = input.battle.rounds.length - notableRounds.length;

  return [
    `${winnerName}'s team defeated ${loserName}'s team.`,
    `Team HP remaining: winner ${summary.winnerRemainingHp}, opponent ${summary.loserRemainingHp}.`,
    `Why ${winnerName} won: their team dealt ${summary.winnerDamageDealt} total damage, kept ${summary.winnerRemainingHp} team HP, and knocked out ${summary.loserFaintedCount}/${summary.loserTeamSize} opposing lions.`,
    ...notableRounds,
    hiddenRounds > 0
      ? `- ${hiddenRounds} more battle action${hiddenRounds === 1 ? "" : "s"} resolved.`
      : null,
    input.mvpLion
      ? `MVP: ${getOwnedLionDisplayName(input.mvpLion)} \`${input.mvpLion.species.publicId}\``
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

export const formatRecentNotableLionCatchesMessage = (input: {
  entries: RecentLionCatchEntry[];
}): string => {
  if (input.entries.length === 0) {
    return "No rare or high-level catches have been recorded in this server yet.";
  }

  return [
    "Recent notable lion catches:",
    ...input.entries.map(
      (entry) =>
        `${entry.rank}. Lv. ${entry.spawn.level} ${entry.spawn.species.rarity} ${entry.spawn.species.name} \`${entry.spawn.species.publicId}\` caught by ${entry.caughtByDisplayName}${entry.spawn.caughtAt ? ` ${formatDiscordTimestamp(entry.spawn.caughtAt)}` : ""}`
    )
  ].join("\n");
};

export const formatLionBattleHistoryMessage = (input: {
  battles: LionBattleRecord[];
  displayName?: string;
}): string => {
  if (input.battles.length === 0) {
    return input.displayName
      ? `${input.displayName} has no recorded lion team battles yet.`
      : "No lion team battles have been recorded in this server yet.";
  }

  return [
    input.displayName
      ? `Recent lion battles for ${input.displayName}:`
      : "Recent lion battles:",
    ...input.battles.map(
      (battle, index) =>
        `${index + 1}. ${battle.winnerDisplayName} defeated ${battle.loserDisplayName} ${formatDiscordTimestamp(battle.createdAt)}${battle.mvpLionName ? ` | MVP: ${battle.mvpLionName}` : ""} | ${battle.roundsCount} rounds`
    )
  ].join("\n");
};

const formatWinRate = (winRate: number): string =>
  `${Math.round(winRate * 100)}%`;

export const formatLionTrainerBattleStatsMessage = (input: {
  stats: LionTrainerBattleStats;
  displayName: string;
}): string =>
  [
    `${input.displayName}'s lion battle stats:`,
    `Battles: ${input.stats.battles}`,
    `Wins: ${input.stats.wins}`,
    `Losses: ${input.stats.losses}`,
    `Win rate: ${formatWinRate(input.stats.winRate)}`
  ].join("\n");

export const formatLionBattleBoardMessage = (input: {
  entries: LionTrainerBattleStatsEntry[];
}): string => {
  if (input.entries.length === 0) {
    return "No trainer battle wins have been recorded in this server yet.";
  }

  return [
    "Top lion battle trainers:",
    ...input.entries.map(
      (entry) =>
        `${entry.rank}. ${entry.displayName} - ${entry.wins}W/${entry.losses}L - ${formatWinRate(entry.winRate)} win rate`
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

      return `${entry.rank}. ${getOwnedLionDisplayName(entry.lion)} \`${entry.lion.species.publicId}\` - Lv. ${entry.lion.level} - ${entry.lion.species.rarity} - ${stats.hp} HP/${stats.attack} ATK/${stats.defense} DEF/${stats.speed} SPD - owner: ${entry.ownerDisplayName}`;
    })
  ].join("\n");
};

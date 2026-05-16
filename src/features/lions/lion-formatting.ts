import type {
  ActiveLionSpawnWithSpeciesRecord,
  LionShopItemRecord,
  UserItemInventoryRecord,
  UserLionWithSpeciesRecord
} from "./lion-creature.service.js";
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
    `A wild ${input.spawn.species.name} appeared in <#${input.spawn.channelId}>.`,
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
    "- `~lions` view your roster",
    "- `~lion <id or name>` inspect one lion",
    "- `~wild` view active wild lions",
    "Admin command:",
    "- `/lionadmin` manage spawn timing and force drops"
  ].join("\n");

export const formatUserLionsMessage = (input: {
  lions: UserLionWithSpeciesRecord[];
  displayName: string;
}): string => {
  if (input.lions.length === 0) {
    return `${input.displayName} has not caught any lions yet.`;
  }

  return [
    `${input.displayName}'s lions:`,
    ...input.lions.map(
      (lion, index) =>
        `${index + 1}. ${lion.species.name} \`${lion.species.publicId}\` (${lion.species.rarity}) - Lv. ${lion.level} - owned id: \`${lion.id.slice(0, 8)}\``
    )
  ].join("\n");
};

export const formatOwnedLionMessage = (
  lion: UserLionWithSpeciesRecord
): string => {
  const stats = deriveLionStats(lion.species, lion.level);
  const progress = getLionExperienceProgress(lion.experience);

  return [
    `${lion.species.name} \`${lion.species.publicId}\``,
    `Slug: \`${lion.species.slug}\` | Owned id: \`${lion.id.slice(0, 8)}\``,
    `Rarity: ${lion.species.rarity}`,
    `Type: ${lion.species.primaryType}${lion.species.secondaryType ? ` / ${lion.species.secondaryType}` : ""}`,
    `Ability: ${lion.species.abilityName}`,
    `Level: ${lion.level}`,
    `XP: ${lion.experience} (${progress.xpNeededForNextLevel} to next level)`,
    `Stats: ${stats.hp} HP | ${stats.attack} ATK | ${stats.defense} DEF | ${stats.speed} SPD`,
    `Caught: ${formatDiscordTimestamp(lion.acquiredAt, "t")}`,
    lion.species.description
  ].join("\n");
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
        `- ${spawn.species.name} \`${spawn.species.publicId}\` in <#${spawn.channelId}> until ${formatDiscordTimestamp(spawn.expiresAt)}`
    )
  ].join("\n");
};

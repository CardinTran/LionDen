import {
  attemptCatchWildLion,
  getOwnedLionDisplayName,
  HIGH_LEVEL_WILD_LION_THRESHOLD,
  normalizeLionItemKey
} from "../../../features/lions/lion-creature.service.js";
import { recordWeeklyChallengeProgressSafely } from "../../../features/challenges/weekly-challenge-hooks.js";
import { recordLionCatchHousePointsSafely } from "../../../features/houses/house-hooks.js";
import { prisma } from "../../../lib/prisma.js";
import { getDisplayName } from "./data.js";
import type { LionMessageCommandHandler } from "./types.js";

export const handleCatchLionMessage: LionMessageCommandHandler = async ({
  message,
  guildId,
  normalizedCommand,
  args
}) => {
  if (normalizedCommand !== "~catch") {
    return false;
  }

  const itemKey = normalizeLionItemKey(args.join(" ") || "basic-ball");
  const result = await attemptCatchWildLion(prisma, {
    guildId,
    channelId: message.channelId,
    userId: message.author.id,
    displayName: getDisplayName(message),
    itemKey,
    now: message.createdAt,
    random: Math.random
  });

  if (result.outcome === "no_spawn") {
    await message.reply("There is no active wild lion in this channel.");
    return true;
  }

  if (result.outcome === "spawn_expired") {
    await message.reply("That wild lion already left.");
    return true;
  }

  if (result.outcome === "item_not_found") {
    await message.reply(
      "That catching item does not exist. Use `~shop` to see items."
    );
    return true;
  }

  if (result.outcome === "not_a_ball") {
    await message.reply(
      `${result.item?.name ?? "That item"} cannot be used to catch lions yet.`
    );
    return true;
  }

  if (result.outcome === "no_item") {
    await message.reply(
      `You do not have any \`${itemKey}\`. Use \`~shop\` and \`~buy\` first.`
    );
    return true;
  }

  if (result.outcome === "missed") {
    await message.reply(
      `${result.item?.name ?? "The ball"} failed. ${result.spawn?.species.name ?? "The wild lion"} is still here.`
    );
    return true;
  }

  if (result.outcome === "already_caught") {
    await message.reply("That wild lion was already caught.");
    return true;
  }

  const notableCatch =
    (result.ownedLion?.level ?? result.spawn?.level ?? 1) >=
      HIGH_LEVEL_WILD_LION_THRESHOLD ||
    ["RARE", "EPIC", "LEGENDARY"].includes(
      result.ownedLion?.species.rarity ?? result.spawn?.species.rarity ?? ""
    );
  const catchPrefix = notableCatch ? "Notable catch! " : "";

  await recordWeeklyChallengeProgressSafely(prisma, {
    guildId,
    userId: message.author.id,
    displayName: getDisplayName(message),
    activityType: "LION_CATCH",
    occurredAt: message.createdAt
  });
  await recordLionCatchHousePointsSafely(prisma, {
    guildId,
    userId: message.author.id,
    sourceId: result.spawn
      ? `lion_catch:${result.spawn.id}:${message.author.id}`
      : `lion_catch:${result.ownedLion?.id ?? "unknown"}:${message.author.id}`
  });

  await message.reply(
    `${catchPrefix}${getDisplayName(message)} caught Lv. ${result.ownedLion?.level ?? result.spawn?.level ?? 1} ${result.ownedLion ? getOwnedLionDisplayName(result.ownedLion) : (result.spawn?.species.name ?? "a wild lion")} ${result.ownedLion?.species.publicId ? `\`${result.ownedLion.species.publicId}\`` : ""} with ${result.item?.name ?? "a ball"}.`
  );
  return true;
};

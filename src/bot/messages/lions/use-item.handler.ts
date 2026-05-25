import {
  activateLionChannelEffect,
  listLionShopItems,
  normalizeLionItemKey,
  useLionTrainingItem
} from "../../../features/lions/lion-creature.service.js";
import { formatUseLionTrainingItemMessage } from "../../../features/lions/lion-formatting.js";
import { prisma } from "../../../lib/prisma.js";
import { getDisplayName } from "./data.js";
import type { LionMessageCommandHandler } from "./types.js";

export const handleUseItemLionMessage: LionMessageCommandHandler = async ({
  message,
  guildId,
  normalizedCommand,
  args
}) => {
  if (normalizedCommand !== "~use") {
    return false;
  }

  if (args.length === 0) {
    await message.reply(
      "Use `~use <item>` to activate a lion item in this channel."
    );
    return true;
  }

  const itemKey = normalizeLionItemKey(args[0] ?? "");
  const items = await listLionShopItems(prisma);
  const item = items.find((entry) => entry.itemKey === itemKey) ?? null;

  if (!item) {
    await message.reply("That item does not exist. Use `~shop` to see items.");
    return true;
  }

  if (item.category === "BALL") {
    await message.reply(
      `${item.name} is a catching ball, so it is used with \`~catch ${item.itemKey}\` instead.`
    );
    return true;
  }

  if (item.effectType === "TRAINING_XP") {
    const lionQuery = args.slice(1).join(" ");

    if (!lionQuery) {
      await message.reply(
        `Use \`~use ${item.itemKey} <lion>\` to give that item to one of your lions.`
      );
      return true;
    }

    const result = await useLionTrainingItem(prisma, {
      guildId,
      userId: message.author.id,
      itemKey,
      lionQuery
    });

    await message.reply(formatUseLionTrainingItemMessage({ result }));
    return true;
  }

  if (!message.channel.isTextBased() || !("send" in message.channel)) {
    await message.reply("That item can only be used in a server text channel.");
    return true;
  }

  if (
    item.effectType !== "SPAWN_BOOST" &&
    item.effectType !== "RARITY_BOOST" &&
    item.effectType !== "LEVEL_BOOST"
  ) {
    await message.reply(`${item.name} does not have an active-use effect yet.`);
    return true;
  }

  const effect = await activateLionChannelEffect(prisma, {
    guildId,
    channelId: message.channelId,
    userId: message.author.id,
    itemKey,
    effectType: item.effectType,
    effectValue: item.effectValue,
    durationMinutes: item.effectType === "SPAWN_BOOST" ? 30 : 45,
    now: message.createdAt
  });

  if (effect.outcome === "no_item") {
    await message.reply(`You do not have any \`${item.itemKey}\` to use.`);
    return true;
  }

  if (effect.outcome === "already_active") {
    await message.reply(
      `${item.name} is already active in this channel until ${effect.activeEffect?.expiresAt ? `<t:${Math.floor(effect.activeEffect.expiresAt.getTime() / 1000)}:R>` : "later"}.`
    );
    return true;
  }

  await message.reply(
    `${getDisplayName(message)} activated ${item.name} in this channel until ${effect.effect?.expiresAt ? `<t:${Math.floor(effect.effect.expiresAt.getTime() / 1000)}:R>` : "later"}.`
  );
  return true;
};

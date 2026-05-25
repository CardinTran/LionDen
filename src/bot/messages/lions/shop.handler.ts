import {
  listLionShopItems,
  normalizeLionItemKey,
  purchaseLionShopItem
} from "../../../features/lions/lion-creature.service.js";
import { formatLionShopMessage } from "../../../features/lions/lion-formatting.js";
import { prisma } from "../../../lib/prisma.js";
import { getDisplayName } from "./data.js";
import type { LionMessageCommandHandler } from "./types.js";

const parseItemAndQuantity = (
  args: string[]
): {
  itemKey: string;
  quantity: number;
} => {
  const possibleQuantity = Number(args.at(-1));

  if (Number.isInteger(possibleQuantity) && possibleQuantity > 0) {
    return {
      itemKey: normalizeLionItemKey(args.slice(0, -1).join(" ")),
      quantity: possibleQuantity
    };
  }

  return {
    itemKey: normalizeLionItemKey(args.join(" ")),
    quantity: 1
  };
};

export const handleShopLionMessage: LionMessageCommandHandler = async ({
  message,
  guildId,
  normalizedCommand,
  args
}) => {
  if (normalizedCommand === "~shop") {
    const items = await listLionShopItems(prisma);
    await message.reply(formatLionShopMessage(items));
    return true;
  }

  if (normalizedCommand !== "~buy") {
    return false;
  }

  if (args.length === 0) {
    await message.reply(
      "Use `~buy <item> [quantity]`, for example `~buy basic-ball 3`."
    );
    return true;
  }

  const purchase = parseItemAndQuantity(args);
  const result = await purchaseLionShopItem(prisma, {
    guildId,
    userId: message.author.id,
    displayName: getDisplayName(message),
    itemKey: purchase.itemKey,
    quantity: purchase.quantity
  });

  if (result.outcome === "item_not_found" || !result.item) {
    await message.reply(
      "That lion shop item does not exist. Use `~shop` to see items."
    );
    return true;
  }

  if (result.outcome === "insufficient_coins") {
    await message.reply(
      `${result.item.name} costs ${result.item.priceCoins * purchase.quantity} coins. You have ${result.profile.coins}.`
    );
    return true;
  }

  await message.reply(
    `Bought ${purchase.quantity} ${result.item.name} for ${result.item.priceCoins * purchase.quantity} coins. You now have ${result.profile.coins} coins.`
  );
  return true;
};

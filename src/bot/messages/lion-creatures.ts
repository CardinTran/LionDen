import type { Message } from "discord.js";

import { prisma } from "../../lib/prisma.js";
import {
  attemptCatchWildLion,
  listLionShopItems,
  listUserItemInventory,
  listUserLions,
  listActiveWildLionSpawns,
  normalizeLionItemKey,
  purchaseLionShopItem,
  syncDefaultLionData
} from "../../features/lions/lion-creature.service.js";
import {
  formatLionInventoryMessage,
  formatLionShopMessage,
  formatOwnedLionMessage,
  formatUserLionsMessage,
  formatWildLionStatusMessage
} from "../../features/lions/lion-formatting.js";

let lionDataSynced = false;

const ensureLionData = async (): Promise<void> => {
  if (lionDataSynced) {
    return;
  }

  await syncDefaultLionData(prisma);
  lionDataSynced = true;
};

const getDisplayName = (message: Message): string =>
  message.member?.displayName ?? message.author.username;

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

const findOwnedLion = (
  lions: Awaited<ReturnType<typeof listUserLions>>,
  rawQuery: string
) => {
  const query = rawQuery.trim().toLowerCase();

  return (
    lions.find((lion) => lion.id.toLowerCase().startsWith(query)) ??
    lions.find((lion) => lion.species.publicId.toLowerCase() === query) ??
    lions.find((lion) => lion.species.slug === normalizeLionItemKey(query)) ??
    lions.find((lion) => lion.species.name.toLowerCase() === query) ??
    null
  );
};

export const handleLionCreatureMessage = async (
  message: Message
): Promise<boolean> => {
  const content = message.content.trim();

  if (!content.startsWith("~")) {
    return false;
  }

  const [command, ...args] = content.split(/\s+/);
  const normalizedCommand = command.toLowerCase();

  if (
    !["~shop", "~buy", "~bag", "~catch", "~lions", "~lion", "~wild"].includes(
      normalizedCommand
    )
  ) {
    return false;
  }

  if (!message.guildId) {
    return true;
  }

  await ensureLionData();

  if (normalizedCommand === "~shop") {
    const items = await listLionShopItems(prisma);
    await message.reply(formatLionShopMessage(items));
    return true;
  }

  if (normalizedCommand === "~buy") {
    if (args.length === 0) {
      await message.reply(
        "Use `~buy <item> [quantity]`, for example `~buy basic-ball 3`."
      );
      return true;
    }

    const purchase = parseItemAndQuantity(args);
    const result = await purchaseLionShopItem(prisma, {
      guildId: message.guildId,
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
  }

  if (normalizedCommand === "~bag") {
    const inventory = await listUserItemInventory(prisma, {
      guildId: message.guildId,
      userId: message.author.id
    });
    await message.reply(formatLionInventoryMessage({ inventory }));
    return true;
  }

  if (normalizedCommand === "~catch") {
    const itemKey = normalizeLionItemKey(args.join(" ") || "basic-ball");
    const result = await attemptCatchWildLion(prisma, {
      guildId: message.guildId,
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

    await message.reply(
      `${getDisplayName(message)} caught ${result.ownedLion?.species.name ?? "a wild lion"} ${result.ownedLion?.species.publicId ? `\`${result.ownedLion.species.publicId}\`` : ""} with ${result.item?.name ?? "a ball"}.`
    );
    return true;
  }

  if (normalizedCommand === "~lions") {
    const lions = await listUserLions(prisma, {
      guildId: message.guildId,
      userId: message.author.id,
      limit: 20
    });

    await message.reply(
      formatUserLionsMessage({
        lions,
        displayName: getDisplayName(message)
      })
    );
    return true;
  }

  if (normalizedCommand === "~lion") {
    if (args.length === 0) {
      await message.reply(
        "Use `~lion <id or name>` to inspect one of your lions."
      );
      return true;
    }

    const lions = await listUserLions(prisma, {
      guildId: message.guildId,
      userId: message.author.id,
      limit: 100
    });
    const lion = findOwnedLion(lions, args.join(" "));

    if (!lion) {
      await message.reply("I could not find that lion in your roster.");
      return true;
    }

    await message.reply(formatOwnedLionMessage(lion));
    return true;
  }

  if (normalizedCommand === "~wild") {
    const spawns = await listActiveWildLionSpawns(prisma, {
      guildId: message.guildId,
      now: message.createdAt
    });
    await message.reply(formatWildLionStatusMessage(spawns));
    return true;
  }

  return false;
};

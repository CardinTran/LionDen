import {
  clearFavoriteLion,
  setFavoriteLion
} from "../../../features/lions/lion-showcase.service.js";
import {
  formatClearFavoriteLionMessage,
  formatSetFavoriteLionMessage
} from "../../../features/lions/lion-formatting.js";
import { prisma } from "../../../lib/prisma.js";
import type { LionMessageCommandHandler } from "./types.js";

export const handleFavoriteLionMessage: LionMessageCommandHandler = async ({
  message,
  guildId,
  normalizedCommand,
  args
}) => {
  if (normalizedCommand !== "~favorite") {
    return false;
  }

  const query = args.join(" ").trim();

  if (!query) {
    await message.reply(
      "Use `~favorite <lion>` to set your favorite lion, or `~favorite clear` to clear it."
    );
    return true;
  }

  if (query.toLowerCase() === "clear") {
    const result = await clearFavoriteLion(prisma, {
      guildId,
      userId: message.author.id
    });

    await message.reply(formatClearFavoriteLionMessage(result));
    return true;
  }

  const result = await setFavoriteLion(prisma, {
    guildId,
    userId: message.author.id,
    query
  });

  await message.reply(formatSetFavoriteLionMessage(result));
  return true;
};

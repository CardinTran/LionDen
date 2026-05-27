import { showcaseOwnedLion } from "../../../features/lions/lion-showcase.service.js";
import { formatShowcaseOwnedLionMessage } from "../../../features/lions/lion-formatting.js";
import { prisma } from "../../../lib/prisma.js";
import { getDisplayName } from "./data.js";
import type { LionMessageCommandHandler } from "./types.js";

export const handleShowcaseLionMessage: LionMessageCommandHandler = async ({
  message,
  guildId,
  normalizedCommand,
  args
}) => {
  if (normalizedCommand !== "~showcase") {
    return false;
  }

  const result = await showcaseOwnedLion(prisma, {
    guildId,
    userId: message.author.id,
    displayName: getDisplayName(message),
    query: args.join(" ")
  });

  await message.reply(formatShowcaseOwnedLionMessage(result));
  return true;
};

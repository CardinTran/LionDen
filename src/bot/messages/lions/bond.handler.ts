import {
  feedLion,
  getLionBondStatus,
  groomLion
} from "../../../features/lions/lion-bond.service.js";
import {
  formatLionBondStatusMessage,
  formatLionCareResultMessage
} from "../../../features/lions/lion-bond-formatting.js";
import { prisma } from "../../../lib/prisma.js";
import type { LionMessageCommandHandler } from "./types.js";

export const handleBondLionMessage: LionMessageCommandHandler = async ({
  message,
  guildId,
  normalizedCommand,
  args
}) => {
  if (
    normalizedCommand !== "~bond" &&
    normalizedCommand !== "~feed" &&
    normalizedCommand !== "~groom"
  ) {
    return false;
  }

  const query = args.join(" ");
  const now = message.createdAt;

  if (normalizedCommand === "~bond") {
    const result = await getLionBondStatus(prisma, {
      guildId,
      userId: message.author.id,
      query
    });

    await message.reply(formatLionBondStatusMessage(result, now));
    return true;
  }

  const result =
    normalizedCommand === "~feed"
      ? await feedLion(prisma, {
          guildId,
          userId: message.author.id,
          query,
          now
        })
      : await groomLion(prisma, {
          guildId,
          userId: message.author.id,
          query,
          now
        });

  await message.reply(formatLionCareResultMessage(result, now));
  return true;
};

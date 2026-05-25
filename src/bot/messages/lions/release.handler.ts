import {
  calculateLionReleaseCoins,
  findUserLionFromList,
  listUserLions,
  releaseUserLion
} from "../../../features/lions/lion-creature.service.js";
import {
  formatReleaseUserLionMessage,
  formatReleaseUserLionPreviewMessage
} from "../../../features/lions/lion-formatting.js";
import { prisma } from "../../../lib/prisma.js";
import { getDisplayName } from "./data.js";
import type { LionMessageCommandHandler } from "./types.js";

export const handleReleaseLionMessage: LionMessageCommandHandler = async ({
  message,
  guildId,
  normalizedCommand,
  args
}) => {
  if (normalizedCommand !== "~release") {
    return false;
  }

  const hasConfirmed = args.at(-1)?.toLowerCase() === "confirm";
  const query = hasConfirmed ? args.slice(0, -1).join(" ") : args.join(" ");

  if (!query) {
    await message.reply(
      "Use `~release <lion id> confirm` to release one owned lion for coins."
    );
    return true;
  }

  if (!hasConfirmed) {
    const lions = await listUserLions(prisma, {
      guildId,
      userId: message.author.id,
      limit: 100
    });
    const lion = findUserLionFromList(lions, query);

    if (!lion) {
      await message.reply(
        "I could not find that lion in your roster. Try `~lions` to see your owned IDs."
      );
      return true;
    }

    await message.reply(
      formatReleaseUserLionPreviewMessage({
        lion,
        coinsAwarded: calculateLionReleaseCoins(lion)
      })
    );
    return true;
  }

  const result = await releaseUserLion(prisma, {
    guildId,
    userId: message.author.id,
    displayName: getDisplayName(message),
    query
  });

  await message.reply(formatReleaseUserLionMessage(result));
  return true;
};

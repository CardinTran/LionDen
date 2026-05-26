import { trainUserLion } from "../../../features/lions/lion-creature.service.js";
import { recordWeeklyChallengeProgressSafely } from "../../../features/challenges/weekly-challenge-hooks.js";
import { recordLionTrainingHousePointsSafely } from "../../../features/houses/house-hooks.js";
import { formatTrainLionMessage } from "../../../features/lions/lion-formatting.js";
import { prisma } from "../../../lib/prisma.js";
import { getDisplayName } from "./data.js";
import type { LionMessageCommandHandler } from "./types.js";

export const handleTrainingLionMessage: LionMessageCommandHandler = async ({
  message,
  guildId,
  normalizedCommand,
  args
}) => {
  if (normalizedCommand !== "~train") {
    return false;
  }

  if (args.length === 0) {
    await message.reply(
      "Use `~train <lion id or code>`, for example `~train L001`."
    );
    return true;
  }

  const result = await trainUserLion(prisma, {
    guildId,
    userId: message.author.id,
    query: args.join(" "),
    now: message.createdAt
  });

  if (result.outcome === "trained") {
    await recordWeeklyChallengeProgressSafely(prisma, {
      guildId,
      userId: message.author.id,
      displayName: getDisplayName(message),
      activityType: "LION_TRAIN",
      occurredAt: message.createdAt
    });
    if (result.result?.lion.id) {
      await recordLionTrainingHousePointsSafely(prisma, {
        guildId,
        userId: message.author.id,
        sourceId: `lion_training:${result.result.lion.id}:${message.createdAt.toISOString()}:${message.author.id}`
      });
    }
  }

  await message.reply(formatTrainLionMessage({ result }));
  return true;
};

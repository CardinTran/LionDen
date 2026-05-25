import { listActiveWildLionSpawns } from "../../../features/lions/lion-creature.service.js";
import { formatWildLionStatusMessage } from "../../../features/lions/lion-formatting.js";
import { prisma } from "../../../lib/prisma.js";
import type { LionMessageCommandHandler } from "./types.js";

export const handleWildLionMessage: LionMessageCommandHandler = async ({
  message,
  guildId,
  normalizedCommand
}) => {
  if (normalizedCommand !== "~wild") {
    return false;
  }

  const spawns = await listActiveWildLionSpawns(prisma, {
    guildId,
    now: message.createdAt
  });
  await message.reply(formatWildLionStatusMessage(spawns));
  return true;
};

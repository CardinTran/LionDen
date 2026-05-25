import { listUserItemInventory } from "../../../features/lions/lion-creature.service.js";
import { formatLionInventoryMessage } from "../../../features/lions/lion-formatting.js";
import { prisma } from "../../../lib/prisma.js";
import type { LionMessageCommandHandler } from "./types.js";

export const handleInventoryLionMessage: LionMessageCommandHandler = async ({
  message,
  guildId,
  normalizedCommand
}) => {
  if (normalizedCommand !== "~bag") {
    return false;
  }

  const inventory = await listUserItemInventory(prisma, {
    guildId,
    userId: message.author.id
  });
  await message.reply(formatLionInventoryMessage({ inventory }));
  return true;
};

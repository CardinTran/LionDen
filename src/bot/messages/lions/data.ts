import type { Message } from "discord.js";

import { syncDefaultLionData } from "../../../features/lions/lion-creature.service.js";
import { prisma } from "../../../lib/prisma.js";

let lionDataSynced = false;

export const ensureLionData = async (): Promise<void> => {
  if (lionDataSynced) {
    return;
  }

  await syncDefaultLionData(prisma);
  lionDataSynced = true;
};

export const getDisplayName = (message: Message): string =>
  message.member?.displayName ?? message.author.username;

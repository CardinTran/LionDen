import {
  findUserLionFromList,
  listUserLionTeam,
  listUserLions
} from "../../../features/lions/lion-creature.service.js";
import {
  formatOwnedLionMessage,
  formatUserLionsMessage
} from "../../../features/lions/lion-formatting.js";
import { prisma } from "../../../lib/prisma.js";
import { getDisplayName } from "./data.js";
import type { LionMessageCommandHandler } from "./types.js";

export const handleRosterLionMessage: LionMessageCommandHandler = async ({
  message,
  guildId,
  normalizedCommand,
  args
}) => {
  if (normalizedCommand === "~lions") {
    const [lions, team] = await Promise.all([
      listUserLions(prisma, {
        guildId,
        userId: message.author.id,
        limit: 20
      }),
      listUserLionTeam(prisma, {
        guildId,
        userId: message.author.id
      })
    ]);

    await message.reply(
      formatUserLionsMessage({
        lions,
        displayName: getDisplayName(message),
        team
      })
    );
    return true;
  }

  if (normalizedCommand !== "~lion") {
    return false;
  }

  if (args.length === 0) {
    await message.reply("Use `~lion <id or name>` to inspect one of your lions.");
    return true;
  }

  const lions = await listUserLions(prisma, {
    guildId,
    userId: message.author.id,
    limit: 100
  });
  const lion = findUserLionFromList(lions, args.join(" "));

  if (!lion) {
    await message.reply("I could not find that lion in your roster.");
    return true;
  }

  await message.reply(formatOwnedLionMessage(lion, getDisplayName(message)));
  return true;
};

import {
  clearUserLionTeam,
  listUserLionTeam,
  setUserLionTeam
} from "../../../features/lions/lion-creature.service.js";
import {
  formatClearUserLionTeamMessage,
  formatSetUserLionTeamMessage,
  formatUserLionTeamMessage
} from "../../../features/lions/lion-formatting.js";
import { prisma } from "../../../lib/prisma.js";
import { getDisplayName } from "./data.js";
import type { LionMessageCommandHandler } from "./types.js";

export const handleTeamLionMessage: LionMessageCommandHandler = async ({
  message,
  guildId,
  normalizedCommand,
  args
}) => {
  if (normalizedCommand !== "~team") {
    return false;
  }

  const subcommand = args[0]?.toLowerCase();

  if (!subcommand) {
    const team = await listUserLionTeam(prisma, {
      guildId,
      userId: message.author.id
    });

    await message.reply(
      formatUserLionTeamMessage({
        team,
        displayName: getDisplayName(message)
      })
    );
    return true;
  }

  if (subcommand === "clear") {
    const clearedCount = await clearUserLionTeam(prisma, {
      guildId,
      userId: message.author.id
    });

    await message.reply(formatClearUserLionTeamMessage(clearedCount));
    return true;
  }

  if (subcommand === "set") {
    const result = await setUserLionTeam(prisma, {
      guildId,
      userId: message.author.id,
      queries: args.slice(1)
    });

    await message.reply(formatSetUserLionTeamMessage(result));
    return true;
  }

  await message.reply(
    "Use `~team`, `~team set <lion1> <lion2> <lion3>`, or `~team clear`."
  );
  return true;
};

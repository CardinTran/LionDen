import {
  listRecentNotableLionCatches,
  listTopLionBattleTrainers,
  listTopOwnedLions
} from "../../../features/lions/lion-creature.service.js";
import {
  formatLionBattleBoardMessage,
  formatRecentNotableLionCatchesMessage,
  formatTopLionsMessage
} from "../../../features/lions/lion-formatting.js";
import { prisma } from "../../../lib/prisma.js";
import type { LionMessageCommandHandler } from "./types.js";

export const handleLeaderboardsLionMessage: LionMessageCommandHandler =
  async ({ message, guildId, normalizedCommand }) => {
    if (normalizedCommand === "~battleboard") {
      const entries = await listTopLionBattleTrainers(prisma, {
        guildId,
        limit: 10
      });

      await message.reply(formatLionBattleBoardMessage({ entries }));
      return true;
    }

    if (normalizedCommand === "~toplions" || normalizedCommand === "~lionboard") {
      const entries = await listTopOwnedLions(prisma, {
        guildId,
        limit: 10
      });

      await message.reply(formatTopLionsMessage({ entries }));
      return true;
    }

    if (normalizedCommand !== "~rarecatches") {
      return false;
    }

    const entries = await listRecentNotableLionCatches(prisma, {
      guildId,
      limit: 10
    });

    await message.reply(formatRecentNotableLionCatchesMessage({ entries }));
    return true;
  };

import {
  getLionTrainerBattleStats,
  listRecentLionBattles
} from "../../../features/lions/lion-creature.service.js";
import {
  formatLionBattleHistoryMessage,
  formatLionTrainerBattleStatsMessage
} from "../../../features/lions/lion-formatting.js";
import { prisma } from "../../../lib/prisma.js";
import { getDisplayName } from "./data.js";
import type { LionMessageCommandHandler } from "./types.js";

export const handleBattleHistoryLionMessage: LionMessageCommandHandler =
  async ({ message, guildId, normalizedCommand }) => {
    if (normalizedCommand === "~battlehistory") {
      const target = message.mentions.users.first();
      const battles = await listRecentLionBattles(prisma, {
        guildId,
        userId: target?.id,
        limit: 5
      });

      await message.reply(
        formatLionBattleHistoryMessage({
          battles,
          displayName: target
            ? (message.mentions.members?.first()?.displayName ??
              target.username)
            : undefined
        })
      );
      return true;
    }

    if (normalizedCommand !== "~battlestats") {
      return false;
    }

    const target = message.mentions.users.first() ?? message.author;
    const displayName =
      target.id === message.author.id
        ? getDisplayName(message)
        : (message.mentions.members?.first()?.displayName ?? target.username);
    const stats = await getLionTrainerBattleStats(prisma, {
      guildId,
      userId: target.id
    });

    await message.reply(
      formatLionTrainerBattleStatsMessage({
        stats: {
          ...stats,
          displayName
        },
        displayName
      })
    );
    return true;
  };

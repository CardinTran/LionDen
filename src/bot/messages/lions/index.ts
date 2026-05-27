import type { Message } from "discord.js";

import { handleBondLionMessage } from "./bond.handler.js";
import { handleBattleHistoryLionMessage } from "./battle-history.handler.js";
import { handleBattleLionMessage } from "./battle.handler.js";
import { handleCatchLionMessage } from "./catch.handler.js";
import { ensureLionData } from "./data.js";
import { handleDuelLionMessage } from "./duel.handler.js";
import { handleFavoriteLionMessage } from "./favorite.handler.js";
import { handleHelpLionMessage } from "./help.handler.js";
import { handleInventoryLionMessage } from "./inventory.handler.js";
import { handleLeaderboardsLionMessage } from "./leaderboards.handler.js";
import { handleNicknameLionMessage } from "./nickname.handler.js";
import { parseLionMessageCommand } from "./parsing.js";
import { handleReleaseLionMessage } from "./release.handler.js";
import { handleRosterLionMessage } from "./roster.handler.js";
import { handleShowcaseLionMessage } from "./showcase.handler.js";
import { handleShopLionMessage } from "./shop.handler.js";
import { handleTeamLionMessage } from "./team.handler.js";
import { handleTrainingLionMessage } from "./training.handler.js";
import type { LionMessageCommandHandler } from "./types.js";
import { handleUseItemLionMessage } from "./use-item.handler.js";
import { handleWildLionMessage } from "./wild.handler.js";

const lionMessageHandlers: LionMessageCommandHandler[] = [
  handleHelpLionMessage,
  handleShopLionMessage,
  handleInventoryLionMessage,
  handleUseItemLionMessage,
  handleCatchLionMessage,
  handleTrainingLionMessage,
  handleNicknameLionMessage,
  handleFavoriteLionMessage,
  handleShowcaseLionMessage,
  handleBondLionMessage,
  handleReleaseLionMessage,
  handleTeamLionMessage,
  handleDuelLionMessage,
  handleBattleLionMessage,
  handleBattleHistoryLionMessage,
  handleLeaderboardsLionMessage,
  handleRosterLionMessage,
  handleWildLionMessage
];

export const handleLionCreatureMessage = async (
  message: Message
): Promise<boolean> => {
  const parsedCommand = parseLionMessageCommand(message.content);

  if (!parsedCommand) {
    return false;
  }

  if (!message.guildId) {
    return true;
  }

  await ensureLionData();

  const context = {
    message,
    guildId: message.guildId,
    normalizedCommand: parsedCommand.normalizedCommand,
    args: parsedCommand.args
  };

  for (const handler of lionMessageHandlers) {
    if (await handler(context)) {
      return true;
    }
  }

  return false;
};

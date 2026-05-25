import { formatLionHelpMessage } from "../../../features/lions/lion-formatting.js";
import type { LionMessageCommandHandler } from "./types.js";

export const handleHelpLionMessage: LionMessageCommandHandler = async ({
  message,
  normalizedCommand
}) => {
  if (normalizedCommand !== "~help") {
    return false;
  }

  await message.reply(formatLionHelpMessage());
  return true;
};

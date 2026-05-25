import type { Message } from "discord.js";

import type { LionMessageCommand } from "./parsing.js";

export interface LionMessageCommandContext {
  message: Message;
  guildId: string;
  normalizedCommand: LionMessageCommand;
  args: string[];
}

export type LionMessageCommandHandler = (
  context: LionMessageCommandContext
) => Promise<boolean>;

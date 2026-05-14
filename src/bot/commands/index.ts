import { Collection } from "discord.js";

import { coinsCommand } from "./coins.js";
import { dailyCommand } from "./daily.js";
import { leaderboardCommand } from "./leaderboard.js";
import { practiceCommand } from "./practice.js";
import { profileCommand } from "./profile.js";
import { pingCommand, type SlashCommand } from "./ping.js";
import { xpCommand } from "./xp.js";

export const commands = [
  pingCommand,
  profileCommand,
  dailyCommand,
  coinsCommand,
  leaderboardCommand,
  xpCommand,
  practiceCommand
];

export const commandRegistry = new Collection<string, SlashCommand>(
  commands.map((command) => [command.data.name, command])
);

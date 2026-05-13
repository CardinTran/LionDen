import { Collection } from "discord.js";

import { leaderboardCommand } from "./leaderboard.js";
import { profileCommand } from "./profile.js";
import { pingCommand, type SlashCommand } from "./ping.js";
import { xpCommand } from "./xp.js";

export const commands = [pingCommand, profileCommand, leaderboardCommand, xpCommand];

export const commandRegistry = new Collection<string, SlashCommand>(
  commands.map((command) => [command.data.name, command])
);

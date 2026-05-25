import { Collection } from "discord.js";

import { botAdminCommand } from "./botadmin.js";
import { coinsCommand } from "./coins.js";
import { dailyCommand } from "./daily.js";
import { leaderboardCommand } from "./leaderboard.js";
import { lionAdminCommand } from "./lionadmin.js";
import { practiceCommand } from "./practice.js";
import { profileCommand } from "./profile.js";
import { redEnvelopeCommand } from "./redenvelope.js";
import { pingCommand } from "./ping.js";
import type { SlashCommand } from "./types.js";
import { weeklyCommand } from "./weekly.js";
import { xpCommand } from "./xp.js";

export const commands = [
  pingCommand,
  botAdminCommand,
  profileCommand,
  dailyCommand,
  coinsCommand,
  redEnvelopeCommand,
  lionAdminCommand,
  leaderboardCommand,
  weeklyCommand,
  xpCommand,
  practiceCommand
];

export const commandRegistry = new Collection<string, SlashCommand>(
  commands.map((command) => [command.data.name, command])
);

import { Collection } from "discord.js";

import { pingCommand, type SlashCommand } from "./ping.js";

export const commands = [pingCommand];

export const commandRegistry = new Collection<string, SlashCommand>(
  commands.map((command) => [command.data.name, command])
);

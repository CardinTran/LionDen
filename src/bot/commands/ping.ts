import {
  SlashCommandBuilder,
  type RESTPostAPIChatInputApplicationCommandsJSONBody
} from "discord.js";

import type { SlashCommand } from "./types.js";

export const pingCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check whether LionDen is online and responsive."),
  async execute(interaction): Promise<void> {
    const latencyMs = Date.now() - interaction.createdTimestamp;

    await interaction.reply({
      content: `Pong! Round-trip latency: ${latencyMs}ms`,
      ephemeral: true
    });
  }
};

export const pingCommandJson =
  pingCommand.data.toJSON() satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;

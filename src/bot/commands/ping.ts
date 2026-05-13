import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  type RESTPostAPIChatInputApplicationCommandsJSONBody
} from "discord.js";

export interface SlashCommand {
  data: SlashCommandBuilder;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

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

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  type RESTPostAPIChatInputApplicationCommandsJSONBody
} from "discord.js";

import { getOrCreateProfile } from "../../features/profiles/profile.service.js";
import { prisma } from "../../lib/prisma.js";
import type { SlashCommand } from "./ping.js";

const formatProfileMessage = (profile: {
  displayName: string;
  level: number;
  xp: number;
}): string => {
  return [
    `Profile for ${profile.displayName}`,
    `Level: ${profile.level}`,
    `XP: ${profile.xp}`
  ].join("\n");
};

export const profileCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("View your LionDen progression profile."),
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.guildId;

    if (!guildId) {
      await interaction.reply({
        content: "This command can only be used inside a server.",
        ephemeral: true
      });
      return;
    }

    const profile = await getOrCreateProfile(prisma, {
      guildId,
      userId: interaction.user.id,
      displayName: interaction.member?.user.username ?? interaction.user.username
    });

    await interaction.reply({
      content: formatProfileMessage(profile),
      ephemeral: true
    });
  }
};

export const profileCommandJson =
  profileCommand.data.toJSON() satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;

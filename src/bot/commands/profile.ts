import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  type RESTPostAPIChatInputApplicationCommandsJSONBody
} from "discord.js";

import { getLevelProgressFromXp } from "../../features/progression/leveling.js";
import { getOrCreateProfile } from "../../features/profiles/profile.service.js";
import { formatFavoriteLionSummary } from "../../features/lions/lion-formatting.js";
import { getFavoriteLionForProfile } from "../../features/lions/lion-showcase.service.js";
import { prisma } from "../../lib/prisma.js";
import type { SlashCommand } from "./types.js";

const formatProfileMessage = (
  profile: {
    displayName: string;
    xp: number;
    coins: number;
  },
  favoriteLion: Parameters<typeof formatFavoriteLionSummary>[0] = null
): string => {
  const progress = getLevelProgressFromXp(profile.xp);

  return [
    `Profile for ${profile.displayName}`,
    `Level: ${progress.currentLevel}`,
    `Total XP: ${profile.xp}`,
    `Coins: ${profile.coins}`,
    formatFavoriteLionSummary(favoriteLion),
    `Progress to Level ${progress.nextLevel}: ${progress.xpIntoLevel}/${progress.xpSpanThisLevel} XP`,
    `XP Needed: ${progress.xpNeededForNextLevel}`
  ]
    .filter(Boolean)
    .join("\n");
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

    const [profile, favorite] = await Promise.all([
      getOrCreateProfile(prisma, {
        guildId,
        userId: interaction.user.id,
        displayName: interaction.member?.user.username ?? interaction.user.username
      }),
      getFavoriteLionForProfile(prisma, {
        guildId,
        userId: interaction.user.id
      })
    ]);

    await interaction.reply({
      content: formatProfileMessage(profile, favorite?.lion ?? null),
      ephemeral: true
    });
  }
};

export const profileCommandJson =
  profileCommand.data.toJSON() satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;

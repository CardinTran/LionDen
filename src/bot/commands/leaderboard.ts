import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  type RESTPostAPIChatInputApplicationCommandsJSONBody
} from "discord.js";

import { getLevelFromXp } from "../../features/progression/leveling.js";
import { listTopProfiles } from "../../features/profiles/profile.service.js";
import { prisma } from "../../lib/prisma.js";
import type { SlashCommand } from "./ping.js";

interface LeaderboardEntry {
  displayName: string;
  xp: number;
}

export const formatLeaderboardMessage = (
  profiles: LeaderboardEntry[]
): string => {
  if (profiles.length === 0) {
    return "No LionDen rankings yet. Start chatting to claim the first spot.";
  }

  const lines = profiles.map((profile, index) => {
    const level = getLevelFromXp(profile.xp);

    return `${index + 1}. ${profile.displayName} — Level ${level} (${profile.xp} XP)`;
  });

  return ["LionDen Leaderboard", ...lines].join("\n");
};

export const leaderboardCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("View the top LionDen XP rankings for this server."),
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.guildId;

    if (!guildId) {
      await interaction.reply({
        content: "This command can only be used inside a server.",
        ephemeral: true
      });
      return;
    }

    const profiles = await listTopProfiles(prisma, {
      guildId,
      limit: 10
    });

    await interaction.reply({
      content: formatLeaderboardMessage(profiles),
      ephemeral: true
    });
  }
};

export const leaderboardCommandJson =
  leaderboardCommand.data.toJSON() satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;

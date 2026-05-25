import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  type RESTPostAPIChatInputApplicationCommandsJSONBody
} from "discord.js";

import {
  getUserBadgeView,
  getUserWeeklyChallengeView,
  type UserBadgeViewEntry,
  type WeeklyChallengeViewEntry
} from "../../features/challenges/weekly-challenge.service.js";
import { prisma } from "../../lib/prisma.js";
import type { SlashCommand } from "./types.js";

const formatRewardText = (input: {
  rewardXp: number;
  rewardCoins: number;
}): string => {
  const rewards = [
    input.rewardXp > 0 ? `${input.rewardXp} XP` : null,
    input.rewardCoins > 0 ? `${input.rewardCoins} coins` : null
  ].filter(Boolean);

  return rewards.length > 0 ? rewards.join(", ") : "badge progress";
};

export const formatWeeklyChallengesMessage = (input: {
  weekKey: string;
  challenges: WeeklyChallengeViewEntry[];
}): string => {
  if (input.challenges.length === 0) {
    return "No weekly challenges are enabled right now.";
  }

  return [
    "LionDen weekly challenges",
    `Week: ${input.weekKey}`,
    ...input.challenges.map((entry) => {
      const progress = `${entry.progressCount}/${entry.definition.targetCount}`;
      const status = entry.isCompleted ? "[done]" : "[todo]";

      return `${status} ${entry.definition.title}: ${progress} - ${entry.definition.description} Reward: ${formatRewardText(entry.definition)}.`;
    })
  ].join("\n");
};

export const formatWeeklyBadgesMessage = (input: {
  displayName: string;
  badges: UserBadgeViewEntry[];
}): string => {
  if (input.badges.length === 0) {
    return `${input.displayName} has not earned any LionDen badges yet.`;
  }

  return [
    `${input.displayName}'s LionDen badges:`,
    ...input.badges.map((entry) => {
      const title = entry.definition?.title ?? entry.badge.badgeKey;
      const description = entry.definition?.description ?? "Badge definition unavailable.";
      const awardedAt = `<t:${Math.floor(entry.badge.awardedAt.getTime() / 1000)}:R>`;

      return `- ${title}: ${description} Earned ${awardedAt}.`;
    })
  ].join("\n");
};

export const weeklyCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("weekly")
    .setDescription("View LionDen weekly challenges and badges.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("challenges")
        .setDescription("View your weekly LionDen challenge progress.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("badges")
        .setDescription("View your earned LionDen badges.")
    ) as SlashCommandBuilder,
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.guildId;

    if (!guildId) {
      await interaction.reply({
        content: "This command can only be used inside a server.",
        ephemeral: true
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand(true);
    const displayName =
      interaction.member?.user.username ?? interaction.user.username;

    if (subcommand === "badges") {
      const badges = await getUserBadgeView(prisma, {
        guildId,
        userId: interaction.user.id
      });

      await interaction.reply({
        content: formatWeeklyBadgesMessage({
          displayName,
          badges
        }),
        ephemeral: true
      });
      return;
    }

    const view = await getUserWeeklyChallengeView(prisma, {
      guildId,
      userId: interaction.user.id,
      now: new Date()
    });

    await interaction.reply({
      content: formatWeeklyChallengesMessage(view),
      ephemeral: true
    });
  }
};

export const weeklyCommandJson =
  weeklyCommand.data.toJSON() satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  type RESTPostAPIChatInputApplicationCommandsJSONBody
} from "discord.js";

import {
  DAILY_COIN_REWARD,
  DAILY_TIMEZONE,
  claimDaily
} from "../../features/economy/daily-claim.service.js";
import { prisma } from "../../lib/prisma.js";
import type { SlashCommand } from "./ping.js";

export const formatDailySuccessMessage = (input: {
  displayName: string;
  coinsAwarded: number;
  totalCoins: number;
}): string =>
  [
    `${input.displayName} claimed today's daily reward.`,
    `You received ${input.coinsAwarded} coins and now have ${input.totalCoins} total coins.`
  ].join("\n");

export const formatDailyCooldownMessage = (input: {
  displayName: string;
  nextClaimAt: Date;
}): string =>
  [
    `${input.displayName} already claimed today's daily reward.`,
    `You can claim again after ${input.nextClaimAt.toLocaleString("en-US", {
      timeZone: DAILY_TIMEZONE,
      dateStyle: "medium",
      timeStyle: "short"
    })} ${DAILY_TIMEZONE}.`
  ].join("\n");

export const dailyCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Claim your daily LionDen coin reward."),
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.guildId;

    if (!guildId) {
      await interaction.reply({
        content: "This command can only be used inside a server.",
        ephemeral: true
      });
      return;
    }

    const displayName =
      interaction.member?.user.username ?? interaction.user.username;
    const result = await claimDaily(prisma, {
      guildId,
      userId: interaction.user.id,
      displayName,
      claimedAt: new Date()
    });

    await interaction.reply({
      content: result.claimed
        ? formatDailySuccessMessage({
            displayName,
            coinsAwarded: DAILY_COIN_REWARD,
            totalCoins: result.profile.coins
          })
        : formatDailyCooldownMessage({
            displayName,
            nextClaimAt: result.nextClaimAt
          }),
      ephemeral: true
    });
  }
};

export const dailyCommandJson =
  dailyCommand.data.toJSON() satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;

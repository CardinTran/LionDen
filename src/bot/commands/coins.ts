import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type RESTPostAPIChatInputApplicationCommandsJSONBody
} from "discord.js";

import { adjustCoins } from "../../features/economy/coin-balance.service.js";
import { prisma } from "../../lib/prisma.js";
import type { SlashCommand } from "./ping.js";

export const formatCoinAdjustmentMessage = (input: {
  actorName: string;
  targetName: string;
  action: "add" | "remove";
  amount: number;
  coins: number;
}): string => {
  const verb = input.action === "add" ? "added" : "removed";

  return [
    `${input.actorName} ${verb} ${input.amount} coins for ${input.targetName}.`,
    `${input.targetName} now has ${input.coins} total coins.`
  ].join("\n");
};

export const coinsCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("coins")
    .setDescription("Admin controls for adjusting LionDen coins.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Add coins to a member profile.")
        .addUserOption((option) =>
          option
            .setName("member")
            .setDescription("The member whose coins should increase.")
            .setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("How many coins to add.")
            .setMinValue(1)
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Remove coins from a member profile.")
        .addUserOption((option) =>
          option
            .setName("member")
            .setDescription("The member whose coins should decrease.")
            .setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("How many coins to remove.")
            .setMinValue(1)
            .setRequired(true)
        )
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

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({
        content: "You do not have permission to adjust LionDen coins.",
        ephemeral: true
      });
      return;
    }

    const action = interaction.options.getSubcommand(true) as "add" | "remove";
    const member = interaction.options.getUser("member", true);
    const amount = interaction.options.getInteger("amount", true);

    const profile = await adjustCoins(prisma, {
      guildId,
      userId: member.id,
      displayName: member.username,
      delta: action === "add" ? amount : -amount
    });

    await interaction.reply({
      content: formatCoinAdjustmentMessage({
        actorName: interaction.user.username,
        targetName: member.username,
        action,
        amount,
        coins: profile.coins
      }),
      ephemeral: true
    });
  }
};

export const coinsCommandJson =
  coinsCommand.data.toJSON() satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;

import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type RESTPostAPIChatInputApplicationCommandsJSONBody
} from "discord.js";

import { adjustXp } from "../../features/progression/xp-adjustment.service.js";
import { prisma } from "../../lib/prisma.js";
import type { SlashCommand } from "./types.js";

const formatXpAdjustmentMessage = (input: {
  actorName: string;
  targetName: string;
  action: "add" | "remove";
  amount: number;
  xp: number;
  level: number;
}): string => {
  const verb = input.action === "add" ? "added" : "removed";

  return [
    `${input.actorName} ${verb} ${input.amount} XP for ${input.targetName}.`,
    `${input.targetName} is now Level ${input.level} with ${input.xp} total XP.`
  ].join("\n");
};

export const xpCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("xp")
    .setDescription("Admin controls for adjusting LionDen XP.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Add XP to a member profile.")
        .addUserOption((option) =>
          option
            .setName("member")
            .setDescription("The member whose XP should increase.")
            .setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("How much XP to add.")
            .setMinValue(1)
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Remove XP from a member profile.")
        .addUserOption((option) =>
          option
            .setName("member")
            .setDescription("The member whose XP should decrease.")
            .setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("How much XP to remove.")
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
        content: "You do not have permission to adjust LionDen XP.",
        ephemeral: true
      });
      return;
    }

    const action = interaction.options.getSubcommand(true) as "add" | "remove";
    const member = interaction.options.getUser("member", true);
    const amount = interaction.options.getInteger("amount", true);

    const profile = await adjustXp(prisma, {
      guildId,
      userId: member.id,
      displayName: member.username,
      delta: action === "add" ? amount : -amount
    });

    await interaction.reply({
      content: formatXpAdjustmentMessage({
        actorName: interaction.user.username,
        targetName: member.username,
        action,
        amount,
        xp: profile.xp,
        level: profile.level
      }),
      ephemeral: true
    });
  }
};

export const xpCommandJson =
  xpCommand.data.toJSON() satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;

export { formatXpAdjustmentMessage };

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  type RESTPostAPIChatInputApplicationCommandsJSONBody
} from "discord.js";

import {
  getHouseProfile,
  joinHouse,
  leaveHouse,
  listHouseLeaderboard,
  listHouseRoster
} from "../../features/houses/house.service.js";
import {
  formatHouseJoinMessage,
  formatHouseLeaderboardMessage,
  formatHouseLeaveMessage,
  formatHouseProfileMessage,
  formatHouseRosterMessage
} from "../../features/houses/house-formatting.js";
import { prisma } from "../../lib/prisma.js";
import type { SlashCommand } from "./types.js";

const getDisplayName = (interaction: ChatInputCommandInteraction): string =>
  interaction.member && "displayName" in interaction.member
    ? interaction.member.displayName
    : interaction.user.username;

export const houseCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("house")
    .setDescription("Join and view LionDen Team Houses.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("join")
        .setDescription("Join an active House.")
        .addStringOption((option) =>
          option
            .setName("house")
            .setDescription("House key, such as red-house.")
            .setRequired(true)
            .setMaxLength(64)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("leave").setDescription("Leave your current House.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("profile")
        .setDescription("View your House profile.")
        .addUserOption((option) =>
          option
            .setName("member")
            .setDescription("Optional member whose House profile to view.")
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("leaderboard")
        .setDescription("View House Cup standings.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("roster")
        .setDescription("View a House roster.")
        .addStringOption((option) =>
          option
            .setName("house")
            .setDescription("House key, such as red-house.")
            .setRequired(true)
            .setMaxLength(64)
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

    const subcommand = interaction.options.getSubcommand(true);

    if (subcommand === "join") {
      const result = await joinHouse(prisma, {
        guildId,
        userId: interaction.user.id,
        houseKey: interaction.options.getString("house", true)
      });

      await interaction.reply({
        content: formatHouseJoinMessage(result),
        ephemeral: true
      });
      return;
    }

    if (subcommand === "leave") {
      const result = await leaveHouse(prisma, {
        guildId,
        userId: interaction.user.id
      });

      await interaction.reply({
        content: formatHouseLeaveMessage(result),
        ephemeral: true
      });
      return;
    }

    if (subcommand === "profile") {
      const member = interaction.options.getUser("member") ?? interaction.user;
      const profile = await getHouseProfile(prisma, {
        guildId,
        userId: member.id,
        now: new Date()
      });

      await interaction.reply({
        content: formatHouseProfileMessage({
          displayName:
            member.id === interaction.user.id
              ? getDisplayName(interaction)
              : member.username,
          profile
        }),
        ephemeral: true
      });
      return;
    }

    if (subcommand === "leaderboard") {
      const leaderboard = await listHouseLeaderboard(prisma, {
        guildId,
        activeOnly: true
      });

      await interaction.reply({
        content: formatHouseLeaderboardMessage(leaderboard),
        ephemeral: true
      });
      return;
    }

    const roster = await listHouseRoster(prisma, {
      guildId,
      houseKey: interaction.options.getString("house", true)
    });

    await interaction.reply({
      content: formatHouseRosterMessage({
        house: roster.house,
        userIds: roster.memberships.map((membership) => membership.userId)
      }),
      ephemeral: true
    });
  }
};

export const houseCommandJson =
  houseCommand.data.toJSON() satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;

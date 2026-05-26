import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type RESTPostAPIChatInputApplicationCommandsJSONBody
} from "discord.js";

import {
  addHousePoints,
  assignUserToHouse,
  createHouse,
  deactivateHouse,
  getHouseByKey,
  removeHousePoints,
  removeUserFromHouse,
  renameHouse
} from "../../features/houses/house.service.js";
import {
  formatHouseAdminMembershipMessage,
  formatHouseCreateMessage,
  formatHousePointAdjustmentMessage,
  formatHouseUpdateMessage
} from "../../features/houses/house-formatting.js";
import { prisma } from "../../lib/prisma.js";
import type { SlashCommand } from "./types.js";

const requireManageGuild = async (
  interaction: ChatInputCommandInteraction
): Promise<boolean> => {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({
      content: "You do not have permission to manage LionDen Houses.",
      ephemeral: true
    });
    return false;
  }

  return true;
};

const addHouseKeyOption = <
  OptionBuilder extends { setName(name: string): OptionBuilder }
>(
  option: OptionBuilder
): OptionBuilder => option.setName("house");

export const houseAdminCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("houseadmin")
    .setDescription("Officer controls for LionDen Team Houses.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("Create a House.")
        .addStringOption((option) =>
          option
            .setName("key")
            .setDescription("Stable House key, such as red-house.")
            .setRequired(true)
            .setMaxLength(64)
        )
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("Display name.")
            .setRequired(true)
            .setMaxLength(80)
        )
        .addStringOption((option) =>
          option
            .setName("description")
            .setDescription("Optional House description.")
            .setMaxLength(200)
        )
        .addStringOption((option) =>
          option
            .setName("emoji")
            .setDescription("Optional emoji.")
            .setMaxLength(16)
        )
        .addStringOption((option) =>
          option
            .setName("color")
            .setDescription("Optional color label.")
            .setMaxLength(32)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("assign")
        .setDescription("Assign or move a member to a House.")
        .addUserOption((option) =>
          option
            .setName("member")
            .setDescription("Member to assign.")
            .setRequired(true)
        )
        .addStringOption((option) =>
          addHouseKeyOption(option)
            .setDescription("House key.")
            .setRequired(true)
            .setMaxLength(64)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Remove a member from their House.")
        .addUserOption((option) =>
          option
            .setName("member")
            .setDescription("Member to remove.")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("rename")
        .setDescription("Update House display details.")
        .addStringOption((option) =>
          addHouseKeyOption(option)
            .setDescription("House key.")
            .setRequired(true)
            .setMaxLength(64)
        )
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("New display name.")
            .setMaxLength(80)
        )
        .addStringOption((option) =>
          option
            .setName("description")
            .setDescription("New description.")
            .setMaxLength(200)
        )
        .addStringOption((option) =>
          option.setName("emoji").setDescription("New emoji.").setMaxLength(16)
        )
        .addStringOption((option) =>
          option
            .setName("color")
            .setDescription("New color label.")
            .setMaxLength(32)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("deactivate")
        .setDescription("Deactivate a House.")
        .addStringOption((option) =>
          addHouseKeyOption(option)
            .setDescription("House key.")
            .setRequired(true)
            .setMaxLength(64)
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName("points")
        .setDescription("Adjust House points.")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("add")
            .setDescription("Add manual House points.")
            .addStringOption((option) =>
              addHouseKeyOption(option)
                .setDescription("House key.")
                .setRequired(true)
                .setMaxLength(64)
            )
            .addIntegerOption((option) =>
              option
                .setName("amount")
                .setDescription("Points to add.")
                .setRequired(true)
                .setMinValue(1)
            )
            .addStringOption((option) =>
              option
                .setName("reason")
                .setDescription("Adjustment reason.")
                .setRequired(true)
                .setMaxLength(200)
            )
            .addUserOption((option) =>
              option.setName("member").setDescription("Optional member source.")
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("remove")
            .setDescription("Remove manual House points.")
            .addStringOption((option) =>
              addHouseKeyOption(option)
                .setDescription("House key.")
                .setRequired(true)
                .setMaxLength(64)
            )
            .addIntegerOption((option) =>
              option
                .setName("amount")
                .setDescription("Points to remove.")
                .setRequired(true)
                .setMinValue(1)
            )
            .addStringOption((option) =>
              option
                .setName("reason")
                .setDescription("Adjustment reason.")
                .setRequired(true)
                .setMaxLength(200)
            )
            .addUserOption((option) =>
              option.setName("member").setDescription("Optional member source.")
            )
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

    if (!(await requireManageGuild(interaction))) {
      return;
    }

    const subcommandGroup = interaction.options.getSubcommandGroup(false);
    const subcommand = interaction.options.getSubcommand(true);

    if (subcommand === "create") {
      const result = await createHouse(prisma, {
        guildId,
        houseKey: interaction.options.getString("key", true),
        name: interaction.options.getString("name", true),
        description: interaction.options.getString("description"),
        emoji: interaction.options.getString("emoji"),
        color: interaction.options.getString("color"),
        createdByUserId: interaction.user.id
      });

      await interaction.reply({
        content: formatHouseCreateMessage(result),
        ephemeral: true
      });
      return;
    }

    if (subcommandGroup === "points") {
      const house = await getHouseByKey(prisma, {
        guildId,
        houseKey: interaction.options.getString("house", true)
      });

      if (!house) {
        await interaction.reply({
          content: "I could not find that House.",
          ephemeral: true
        });
        return;
      }

      const amount = interaction.options.getInteger("amount", true);
      const member = interaction.options.getUser("member");
      const reason = interaction.options.getString("reason", true);
      const result =
        subcommand === "add"
          ? await addHousePoints(prisma, {
              guildId,
              houseId: house.id,
              userId: member?.id ?? null,
              sourceType: "ADMIN_ADJUSTMENT",
              sourceId: null,
              points: amount,
              reason,
              adminUserId: interaction.user.id
            })
          : await removeHousePoints(prisma, {
              guildId,
              houseId: house.id,
              userId: member?.id ?? null,
              points: amount,
              reason,
              adminUserId: interaction.user.id
            });

      await interaction.reply({
        content: formatHousePointAdjustmentMessage({
          result,
          points: subcommand === "add" ? amount : -amount
        }),
        ephemeral: true
      });
      return;
    }

    if (subcommand === "assign") {
      const member = interaction.options.getUser("member", true);
      const result = await assignUserToHouse(prisma, {
        guildId,
        userId: member.id,
        houseKey: interaction.options.getString("house", true)
      });

      await interaction.reply({
        content: formatHouseAdminMembershipMessage({
          action: "assign",
          targetName: member.username,
          result
        }),
        ephemeral: true
      });
      return;
    }

    if (subcommand === "remove") {
      const member = interaction.options.getUser("member", true);
      const result = await removeUserFromHouse(prisma, {
        guildId,
        userId: member.id
      });

      await interaction.reply({
        content: formatHouseAdminMembershipMessage({
          action: "remove",
          targetName: member.username,
          result
        }),
        ephemeral: true
      });
      return;
    }

    if (subcommand === "rename") {
      const result = await renameHouse(prisma, {
        guildId,
        houseKey: interaction.options.getString("house", true),
        name: interaction.options.getString("name"),
        description: interaction.options.getString("description"),
        emoji: interaction.options.getString("emoji"),
        color: interaction.options.getString("color")
      });

      await interaction.reply({
        content: formatHouseUpdateMessage(result, "rename"),
        ephemeral: true
      });
      return;
    }

    if (subcommand === "deactivate") {
      const result = await deactivateHouse(prisma, {
        guildId,
        houseKey: interaction.options.getString("house", true),
        deactivatedByUserId: interaction.user.id
      });

      await interaction.reply({
        content: formatHouseUpdateMessage(result, "deactivate"),
        ephemeral: true
      });
      return;
    }
  }
};

export const houseAdminCommandJson =
  houseAdminCommand.data.toJSON() satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;

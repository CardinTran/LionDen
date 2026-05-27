import {
  ChatInputCommandInteraction,
  ChannelType,
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
  awardHouseBadge,
  syncDefaultHouseBadgeDefinitions
} from "../../features/houses/house-achievement.service.js";
import {
  formatHouseBadgeGrantMessage,
  formatHouseBadgeSyncMessage
} from "../../features/houses/house-achievement-formatting.js";
import {
  configureHouseRecap,
  disableHouseRecap,
  getHouseRecapConfig,
  getHouseRecapStatus
} from "../../features/houses/house-recap.service.js";
import {
  fetchHouseRecapChannel,
  postWeeklyHouseRecapNow
} from "../../features/houses/house-recap-scheduler.js";
import {
  formatHouseAdminMembershipMessage,
  formatHouseCreateMessage,
  formatHousePointAdjustmentMessage,
  formatHouseUpdateMessage
} from "../../features/houses/house-formatting.js";
import {
  formatHouseRecapConfiguredMessage,
  formatHouseRecapDisabledMessage,
  formatHouseRecapPostResultMessage,
  formatHouseRecapStatusMessage
} from "../../features/houses/house-recap-formatting.js";
import { logger } from "../../lib/logger.js";
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
    )
    .addSubcommandGroup((group) =>
      group
        .setName("recap")
        .setDescription("Configure and post Weekly House Recaps.")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("configure")
            .setDescription("Enable Weekly House Recaps in a channel.")
            .addChannelOption((option) =>
              option
                .setName("channel")
                .setDescription("Channel where weekly recaps should post.")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
            )
            .addIntegerOption((option) =>
              option
                .setName("weekday")
                .setDescription(
                  "Posting weekday, where 0 is Sunday and 6 is Saturday."
                )
                .setMinValue(0)
                .setMaxValue(6)
            )
            .addIntegerOption((option) =>
              option
                .setName("hour")
                .setDescription("Posting hour in the configured timezone.")
                .setMinValue(0)
                .setMaxValue(23)
            )
            .addIntegerOption((option) =>
              option
                .setName("minute")
                .setDescription("Posting minute in the configured timezone.")
                .setMinValue(0)
                .setMaxValue(59)
            )
            .addStringOption((option) =>
              option
                .setName("timezone")
                .setDescription("IANA timezone, default America/Chicago.")
                .setMaxLength(64)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("postnow")
            .setDescription("Post the current Weekly House Recap now.")
            .addChannelOption((option) =>
              option
                .setName("channel")
                .setDescription("Optional channel override.")
                .addChannelTypes(ChannelType.GuildText)
            )
            .addBooleanOption((option) =>
              option
                .setName("force")
                .setDescription("Post even if this week was already posted.")
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("status")
            .setDescription("Show Weekly House Recap status.")
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("disable")
            .setDescription("Disable automatic Weekly House Recaps.")
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName("badge")
        .setDescription("Manage House badge definitions and awards.")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("sync")
            .setDescription("Sync default House badge definitions.")
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("grant")
            .setDescription("Grant a House badge to a member.")
            .addUserOption((option) =>
              option
                .setName("member")
                .setDescription("Member to receive the badge.")
                .setRequired(true)
            )
            .addStringOption((option) =>
              option
                .setName("badge")
                .setDescription("House badge key, such as house-founder.")
                .setRequired(true)
                .setMaxLength(64)
            )
            .addStringOption((option) =>
              addHouseKeyOption(option)
                .setDescription("Optional House key to associate with the award.")
                .setMaxLength(64)
            )
            .addStringOption((option) =>
              option
                .setName("reason")
                .setDescription("Optional award reason.")
                .setMaxLength(200)
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

    if (subcommandGroup === "recap") {
      if (subcommand === "configure") {
        const channel = interaction.options.getChannel("channel", true);
        const config = await configureHouseRecap(prisma, {
          guildId,
          channelId: channel.id,
          weekday: interaction.options.getInteger("weekday"),
          hour: interaction.options.getInteger("hour"),
          minute: interaction.options.getInteger("minute"),
          timezone: interaction.options.getString("timezone")
        });

        logger.info("Weekly House Recap configured", {
          guildId,
          channelId: config.channelId,
          adminUserId: interaction.user.id
        });

        await interaction.reply({
          content: formatHouseRecapConfiguredMessage(config),
          ephemeral: true
        });
        return;
      }

      if (subcommand === "status") {
        await interaction.reply({
          content: formatHouseRecapStatusMessage(
            await getHouseRecapStatus(prisma, {
              guildId,
              now: new Date()
            })
          ),
          ephemeral: true
        });
        return;
      }

      if (subcommand === "disable") {
        const config = await disableHouseRecap(prisma, guildId);

        logger.info("Weekly House Recap disabled", {
          guildId,
          adminUserId: interaction.user.id
        });

        await interaction.reply({
          content: formatHouseRecapDisabledMessage(config),
          ephemeral: true
        });
        return;
      }

      if (subcommand === "postnow") {
        const selectedChannel = interaction.options.getChannel("channel");
        const config = await getHouseRecapConfig(prisma, guildId);
        const channelId = selectedChannel?.id ?? config?.channelId;

        if (!channelId) {
          await interaction.reply({
            content:
              "Configure Weekly House Recap first or provide a channel option.",
            ephemeral: true
          });
          return;
        }

        const channel =
          selectedChannel && "send" in selectedChannel
            ? (selectedChannel as {
                id: string;
                send(args: { content: string }): Promise<{ id: string }>;
              })
            : await fetchHouseRecapChannel(interaction.client, channelId);

        if (!channel) {
          await interaction.reply({
            content: "I could not access that recap channel.",
            ephemeral: true
          });
          return;
        }

        const result = await postWeeklyHouseRecapNow(prisma, {
          guildId,
          channel,
          now: new Date(),
          force: interaction.options.getBoolean("force") ?? false
        });

        logger.info("Weekly House Recap postnow used", {
          guildId,
          channelId: channel.id,
          adminUserId: interaction.user.id,
          outcome: result.outcome,
          weekKey: result.weekKey
        });

        await interaction.reply({
          content: formatHouseRecapPostResultMessage({
            outcome: result.outcome,
            weekKey: result.weekKey,
            channelId: channel.id
          }),
          ephemeral: true
        });
        return;
      }
    }

    if (subcommandGroup === "badge") {
      if (subcommand === "sync") {
        const definitions = await syncDefaultHouseBadgeDefinitions(prisma);

        logger.info("House badge definitions synced by admin", {
          guildId,
          adminUserId: interaction.user.id,
          badgeCount: definitions.length
        });

        await interaction.reply({
          content: formatHouseBadgeSyncMessage(definitions),
          ephemeral: true
        });
        return;
      }

      if (subcommand === "grant") {
        await syncDefaultHouseBadgeDefinitions(prisma);
        const member = interaction.options.getUser("member", true);
        const houseKey = interaction.options.getString("house");
        const house = houseKey
          ? await getHouseByKey(prisma, {
              guildId,
              houseKey
            })
          : null;

        if (houseKey && !house) {
          await interaction.reply({
            content: "I could not find that House.",
            ephemeral: true
          });
          return;
        }

        const result = await awardHouseBadge(prisma, {
          guildId,
          userId: member.id,
          badgeKey: interaction.options.getString("badge", true),
          houseId: house?.id ?? null,
          awardedAt: new Date(),
          reason:
            interaction.options.getString("reason") ??
            `Manually granted by ${interaction.user.id}.`
        });

        logger.info("House badge grant used", {
          guildId,
          userId: member.id,
          houseId: house?.id,
          badgeKey: interaction.options.getString("badge", true),
          adminUserId: interaction.user.id,
          outcome: result.outcome
        });

        await interaction.reply({
          content: formatHouseBadgeGrantMessage({
            targetName: member.username,
            result
          }),
          ephemeral: true
        });
        return;
      }
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

import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type RESTPostAPIChatInputApplicationCommandsJSONBody
} from "discord.js";

import {
  ensureBotGuildConfig,
  formatMaintenanceNotice,
  getBotGuildConfig,
  setMaintenanceMode,
  type BotGuildConfigRecord
} from "../../features/admin/bot-config.service.js";
import { prisma } from "../../lib/prisma.js";
import { applyBotPresence } from "../presence.js";
import type { SlashCommand } from "./ping.js";

const requireManageGuild = async (
  interaction: ChatInputCommandInteraction
): Promise<boolean> => {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({
      content: "You do not have permission to manage LionDen bot controls.",
      ephemeral: true
    });
    return false;
  }

  return true;
};

export const formatBotAdminStatusMessage = (
  config: BotGuildConfigRecord | null
): string =>
  [
    "LionDen bot admin status",
    `Maintenance mode: ${config?.maintenanceMode ? "enabled" : "disabled"}`,
    `Maintenance message: ${formatMaintenanceNotice(config)}`
  ].join("\n");

export const botAdminCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("botadmin")
    .setDescription("Manage production controls for LionDen.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("status")
        .setDescription("Show current bot maintenance status.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("maintenance")
        .setDescription("Enable or disable maintenance mode.")
        .addBooleanOption((option) =>
          option
            .setName("enabled")
            .setDescription("Whether maintenance mode should be enabled.")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("message")
            .setDescription("Optional public message shown during maintenance.")
            .setMaxLength(300)
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

    const subcommand = interaction.options.getSubcommand(true);

    if (subcommand === "status") {
      const config = await getBotGuildConfig(prisma, guildId);

      await interaction.reply({
        content: formatBotAdminStatusMessage(config),
        ephemeral: true
      });
      return;
    }

    if (subcommand === "maintenance") {
      const enabled = interaction.options.getBoolean("enabled", true);
      const currentConfig = await ensureBotGuildConfig(prisma, {
        guildId
      });
      const message =
        interaction.options.getString("message") ??
        currentConfig.maintenanceMessage;
      const config = await setMaintenanceMode(prisma, {
        guildId,
        enabled,
        message,
        updatedByUserId: interaction.user.id
      });

      applyBotPresence(interaction.client, config);

      await interaction.reply({
        content: [
          `Maintenance mode ${enabled ? "enabled" : "disabled"}.`,
          `Presence updated.`,
          `Message: ${formatMaintenanceNotice(config)}`
        ].join("\n"),
        ephemeral: true
      });
    }
  }
};

export const botAdminCommandJson =
  botAdminCommand.data.toJSON() satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;

import {
  Events,
  PermissionFlagsBits,
  type Client,
  type Interaction
} from "discord.js";

import {
  formatMaintenanceNotice,
  getBotGuildConfig
} from "../../features/admin/bot-config.service.js";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";
import { commandRegistry } from "../commands/index.js";
import {
  handlePracticeButton,
  isPracticeButtonCustomId
} from "../commands/practice.js";
import {
  handleLionDuelButton,
  isLionDuelButtonCustomId
} from "../messages/lions/duel.handler.js";

export const registerInteractionCreateEvent = (client: Client): void => {
  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    if (interaction.guildId) {
      const config = await getBotGuildConfig(prisma, interaction.guildId);

      if (
        config?.maintenanceMode &&
        !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)
      ) {
        const content = formatMaintenanceNotice(config);

        if (interaction.isRepliable()) {
          await interaction.reply({
            content,
            ephemeral: true
          });
        }
        return;
      }
    }

    if (
      interaction.isButton() &&
      isLionDuelButtonCustomId(interaction.customId)
    ) {
      try {
        await handleLionDuelButton(interaction);
      } catch (error) {
        logger.error("Lion duel interaction failed", {
          customId: interaction.customId,
          error
        });

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: "Something went wrong while updating that lion duel.",
            ephemeral: true
          });
          return;
        }

        await interaction.reply({
          content: "Something went wrong while updating that lion duel.",
          ephemeral: true
        });
      }
      return;
    }

    if (
      interaction.isButton() &&
      isPracticeButtonCustomId(interaction.customId)
    ) {
      try {
        await handlePracticeButton(interaction);
      } catch (error) {
        logger.error("Practice interaction failed", {
          customId: interaction.customId,
          error
        });

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content:
              "Something went wrong while recording that practice check-in.",
            ephemeral: true
          });
          return;
        }

        await interaction.reply({
          content:
            "Something went wrong while recording that practice check-in.",
          ephemeral: true
        });
      }
      return;
    }

    if (!interaction.isChatInputCommand()) {
      return;
    }

    const command = commandRegistry.get(interaction.commandName);

    if (!command) {
      logger.warn("Received unknown command", {
        commandName: interaction.commandName
      });
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error("Command execution failed", {
        commandName: interaction.commandName,
        error
      });

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "Something went wrong while running that command.",
          ephemeral: true
        });
        return;
      }

      await interaction.reply({
        content: "Something went wrong while running that command.",
        ephemeral: true
      });
    }
  });
};

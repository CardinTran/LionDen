import {
  Client,
  Events,
  GatewayIntentBits,
  Interaction,
  Message,
  REST,
  Routes
} from "discord.js";

import { awardMessageXp } from "../features/progression/message-xp.service.js";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { prisma } from "../lib/prisma.js";
import { commandRegistry, commands } from "./commands/index.js";
import {
  handlePracticeCheckInButton,
  isPracticeCheckInCustomId
} from "./commands/practice.js";

export const createDiscordClient = (): Client => {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
  });

  client.once(Events.ClientReady, (readyClient) => {
    logger.info("Discord client ready", {
      tag: readyClient.user.tag
    });
  });

  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    if (interaction.isButton() && isPracticeCheckInCustomId(interaction.customId)) {
      try {
        await handlePracticeCheckInButton(interaction);
      } catch (error) {
        logger.error("Practice check-in failed", {
          customId: interaction.customId,
          error
        });

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: "Something went wrong while recording that practice check-in.",
            ephemeral: true
          });
          return;
        }

        await interaction.reply({
          content: "Something went wrong while recording that practice check-in.",
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

  client.on(Events.MessageCreate, async (message: Message) => {
    if (message.author.bot || !message.guildId) {
      return;
    }

    try {
      await awardMessageXp(prisma, {
        guildId: message.guildId,
        userId: message.author.id,
        displayName: message.member?.user.username ?? message.author.username,
        awardedAt: message.createdAt
      });
    } catch (error) {
      logger.error("Message XP award failed", {
        guildId: message.guildId,
        userId: message.author.id,
        error
      });
    }
  });

  return client;
};

export const registerGuildCommands = async (): Promise<void> => {
  const rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID),
    {
      body: commands.map((command) => command.data.toJSON())
    }
  );

  logger.info("Registered guild slash commands", {
    commandCount: commands.length
  });
};

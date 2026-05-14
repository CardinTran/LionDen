import {
  Client,
  Events,
  GatewayIntentBits,
  Interaction,
  Message,
  REST,
  Routes
} from "discord.js";

import {
  claimRedEnvelope,
  getOpenRedEnvelopeForChannel
} from "../features/economy/red-envelope.service.js";
import { recordChannelActivity } from "../features/economy/channel-activity.service.js";
import { awardMessageXp } from "../features/progression/message-xp.service.js";
import { startRedEnvelopeScheduler } from "../features/economy/red-envelope-scheduler.js";
import { startPracticeScheduler } from "../features/practice/practice-scheduler.js";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { prisma } from "../lib/prisma.js";
import { commandRegistry, commands } from "./commands/index.js";
import {
  handlePracticeButton,
  isPracticeButtonCustomId
} from "./commands/practice.js";
import {
  formatRedEnvelopeAlreadyClaimedMessage,
  formatRedEnvelopeClaimSuccessMessage,
  formatRedEnvelopeClaimedMessage,
  RED_ENVELOPE_GRAB_COMMAND
} from "./commands/redenvelope.js";

export const createDiscordClient = (): Client => {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ]
  });

  client.once(Events.ClientReady, (readyClient) => {
    logger.info("Discord client ready", {
      tag: readyClient.user.tag
    });
    startPracticeScheduler(client);
    startRedEnvelopeScheduler(client);
  });

  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    if (interaction.isButton() && isPracticeButtonCustomId(interaction.customId)) {
      try {
        await handlePracticeButton(interaction);
      } catch (error) {
        logger.error("Practice interaction failed", {
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

    if (message.content.trim().toLowerCase() === RED_ENVELOPE_GRAB_COMMAND) {
      try {
        const openEnvelope = await getOpenRedEnvelopeForChannel(prisma, {
          guildId: message.guildId,
          channelId: message.channelId
        });

        if (!openEnvelope) {
          return;
        }

        const result = await claimRedEnvelope(prisma, {
          envelopeId: openEnvelope.id,
          userId: message.author.id,
          displayName: message.member?.user.username ?? message.author.username,
          claimedAt: message.createdAt
        });

        if (!result.envelope) {
          return;
        }

        if (result.outcome === "already_claimed") {
          await message.reply(
            formatRedEnvelopeAlreadyClaimedMessage({
              envelope: result.envelope
            })
          );
          return;
        }

        if (message.channel.isTextBased() && "send" in message.channel) {
          await message.channel.send(
            formatRedEnvelopeClaimedMessage({
              envelope: result.envelope
            })
          );
        }
        await message.reply(
          formatRedEnvelopeClaimSuccessMessage({
            result
          })
        );
      } catch (error) {
        logger.error("Red envelope grab failed", {
          guildId: message.guildId,
          channelId: message.channelId,
          userId: message.author.id,
          error
        });
      }

      return;
    }
    recordChannelActivity({
      guildId: message.guildId,
      channelId: message.channelId,
      occurredAt: message.createdAt
    });
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

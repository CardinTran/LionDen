import {
  Events,
  PermissionFlagsBits,
  type Client,
  type Message
} from "discord.js";

import {
  formatMaintenanceNotice,
  getBotGuildConfig
} from "../../features/admin/bot-config.service.js";
import {
  claimRedEnvelope,
  getOpenRedEnvelopeForChannel
} from "../../features/economy/red-envelope.service.js";
import { recordChannelActivity } from "../../features/economy/channel-activity.service.js";
import { awardMessageXp } from "../../features/progression/message-xp.service.js";
import { logger } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";
import { handleLionCreatureMessage } from "../messages/lion-creatures.js";
import {
  formatRedEnvelopeAlreadyClaimedMessage,
  formatRedEnvelopeClaimSuccessMessage,
  formatRedEnvelopeClaimedMessage,
  RED_ENVELOPE_GRAB_COMMAND
} from "../commands/redenvelope.js";

export const registerMessageCreateEvent = (client: Client): void => {
  client.on(Events.MessageCreate, async (message: Message) => {
    if (message.author.bot || !message.guildId) {
      return;
    }

    const maintenanceConfig = await getBotGuildConfig(prisma, message.guildId);

    if (
      maintenanceConfig?.maintenanceMode &&
      !message.member?.permissions.has(PermissionFlagsBits.ManageGuild)
    ) {
      if (message.content.trim().startsWith("~")) {
        await message.reply(formatMaintenanceNotice(maintenanceConfig));
      }
      return;
    }

    if (message.content.trim().toLowerCase() === RED_ENVELOPE_GRAB_COMMAND) {
      logger.info("Text command routing started", {
        command: RED_ENVELOPE_GRAB_COMMAND,
        guildId: message.guildId,
        channelId: message.channelId,
        userId: message.author.id
      });
      try {
        const openEnvelope = await getOpenRedEnvelopeForChannel(prisma, {
          guildId: message.guildId,
          channelId: message.channelId
        });

        if (!openEnvelope) {
          logger.info("Text command routing succeeded", {
            command: RED_ENVELOPE_GRAB_COMMAND,
            outcome: "no_open_envelope",
            guildId: message.guildId,
            channelId: message.channelId,
            userId: message.author.id
          });
          return;
        }

        const result = await claimRedEnvelope(prisma, {
          envelopeId: openEnvelope.id,
          userId: message.author.id,
          displayName: message.member?.user.username ?? message.author.username,
          claimedAt: message.createdAt
        });

        if (!result.envelope) {
          logger.warn("Text command routing completed without envelope", {
            command: RED_ENVELOPE_GRAB_COMMAND,
            outcome: result.outcome,
            guildId: message.guildId,
            channelId: message.channelId,
            userId: message.author.id
          });
          return;
        }

        if (result.outcome === "already_claimed") {
          await message.reply(
            formatRedEnvelopeAlreadyClaimedMessage({
              envelope: result.envelope
            })
          );
          logger.info("Text command routing succeeded", {
            command: RED_ENVELOPE_GRAB_COMMAND,
            outcome: result.outcome,
            guildId: message.guildId,
            channelId: message.channelId,
            userId: message.author.id
          });
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
        logger.info("Text command routing succeeded", {
          command: RED_ENVELOPE_GRAB_COMMAND,
          outcome: result.outcome,
          envelopeId: result.envelope.id,
          guildId: message.guildId,
          channelId: message.channelId,
          userId: message.author.id
        });
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

    const trimmedContent = message.content.trim();
    const isTextCommand = trimmedContent.startsWith("~");

    try {
      if (isTextCommand) {
        logger.info("Text command routing started", {
          command: trimmedContent.split(/\s+/, 1)[0],
          guildId: message.guildId,
          channelId: message.channelId,
          userId: message.author.id
        });
      }

      const handledLionCommand = await handleLionCreatureMessage(message);

      if (handledLionCommand) {
        logger.info("Text command routing succeeded", {
          command: trimmedContent.split(/\s+/, 1)[0],
          outcome: "handled_lion_command",
          guildId: message.guildId,
          channelId: message.channelId,
          userId: message.author.id
        });
        return;
      }

      if (isTextCommand) {
        logger.info("Text command routing succeeded", {
          command: trimmedContent.split(/\s+/, 1)[0],
          outcome: "ignored",
          guildId: message.guildId,
          channelId: message.channelId,
          userId: message.author.id
        });
      }
    } catch (error) {
      logger.error("Lion creature message command failed", {
        guildId: message.guildId,
        channelId: message.channelId,
        userId: message.author.id,
        error
      });
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
};

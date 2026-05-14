import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  type ButtonInteraction,
  SlashCommandBuilder,
  type RESTPostAPIChatInputApplicationCommandsJSONBody
} from "discord.js";

import {
  attachPracticeAnnouncementMessage,
  endPracticeSession,
  recordPracticeCheckIn,
  startPracticeSession
} from "../../features/practice/practice.service.js";
import { prisma } from "../../lib/prisma.js";
import type { SlashCommand } from "./ping.js";

const PRACTICE_CHECK_IN_PREFIX = "practice:checkin:";

export const buildPracticeCheckInCustomId = (sessionId: string): string => {
  return `${PRACTICE_CHECK_IN_PREFIX}${sessionId}`;
};

export const buildPracticeCheckInComponents = (
  sessionId: string,
  disabled = false
): ActionRowBuilder<ButtonBuilder>[] => {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(buildPracticeCheckInCustomId(sessionId))
        .setLabel(disabled ? "Check-In Closed" : "I'm Here")
        .setStyle(ButtonStyle.Success)
        .setDisabled(disabled)
    )
  ];
};

export const formatPracticeAnnouncementMessage = (input: {
  startedByDisplayName: string;
}): string => {
  return [
    "LionDen practice check-in is live.",
    `Started by ${input.startedByDisplayName}.`,
    "Click the button below if you're at practice tonight."
  ].join("\n");
};

export const practiceCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("practice")
    .setDescription("Manage LionDen practice attendance sessions.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("start")
        .setDescription("Start a practice attendance session in this channel.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("end")
        .setDescription("End the active practice attendance session.")
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
        content: "You do not have permission to manage practice sessions.",
        ephemeral: true
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand(true);

    if (subcommand === "start") {
      const channel = interaction.channel;

      if (
        !channel ||
        !channel.isTextBased() ||
        channel.type === ChannelType.DM ||
        !("send" in channel)
      ) {
        await interaction.reply({
          content:
            "Practice sessions must be started from a server text channel where LionDen can post the attendance message.",
          ephemeral: true
        });
        return;
      }

      const result = await startPracticeSession(prisma, {
        guildId,
        startedByUserId: interaction.user.id,
        startedByDisplayName: interaction.user.username,
        announcementChannelId: channel.id
      });

      if (result.outcome === "already_active") {
        await interaction.reply({
          content: `A practice session is already active in <#${result.session.announcementChannelId}>.`,
          ephemeral: true
        });
        return;
      }

      const announcementMessage = await channel.send({
        content: formatPracticeAnnouncementMessage({
          startedByDisplayName: interaction.user.username
        }),
        components: buildPracticeCheckInComponents(result.session.id)
      });

      await attachPracticeAnnouncementMessage(prisma, {
        sessionId: result.session.id,
        announcementMessageId: announcementMessage.id
      });

      await interaction.reply({
        content: `Practice session started in <#${channel.id}>.`,
        ephemeral: true
      });
      return;
    }

    const result = await endPracticeSession(prisma, {
      guildId,
      endedByUserId: interaction.user.id,
      endedAt: new Date()
    });

    if (!result) {
      await interaction.reply({
        content: "There is no active practice session to end.",
        ephemeral: true
      });
      return;
    }

    if (
      result.session.announcementMessageId &&
      interaction.client.channels &&
      result.session.announcementChannelId
    ) {
      try {
        const channel = await interaction.client.channels.fetch(
          result.session.announcementChannelId
        );

        if (
          channel &&
          channel.isTextBased() &&
          "messages" in channel
        ) {
          const announcement = await channel.messages.fetch(
            result.session.announcementMessageId
          );

          await announcement.edit({
            content: [
              formatPracticeAnnouncementMessage({
                startedByDisplayName: result.session.startedByDisplayName
              }),
              "",
              "Practice check-in is now closed."
            ].join("\n"),
            components: buildPracticeCheckInComponents(result.session.id, true)
          });
        }
      } catch {
        // Best-effort UX update only; the session is already closed in the database.
      }
    }

    await interaction.reply({
      content: `Practice session ended with ${result.checkInCount} check-in${result.checkInCount === 1 ? "" : "s"}.`,
      ephemeral: true
    });
  }
};

export const handlePracticeCheckInButton = async (
  interaction: ButtonInteraction
): Promise<void> => {
  const guildId = interaction.guildId;
  const sessionId = interaction.customId.replace(PRACTICE_CHECK_IN_PREFIX, "");

  if (!guildId || !sessionId) {
    await interaction.reply({
      content: "This check-in button is no longer valid.",
      ephemeral: true
    });
    return;
  }

  const result = await recordPracticeCheckIn(prisma, {
    sessionId,
    guildId,
    userId: interaction.user.id,
    displayName: interaction.user.username
  });

  if (result.outcome === "session_closed") {
    await interaction.reply({
      content: "This practice session is closed.",
      ephemeral: true
    });
    return;
  }

  if (result.outcome === "already_checked_in") {
    await interaction.reply({
      content: `You're already checked in. Current attendance: ${result.checkInCount}.`,
      ephemeral: true
    });
    return;
  }

  await interaction.reply({
    content: `You're checked in for practice. Current attendance: ${result.checkInCount}.`,
    ephemeral: true
  });
};

export const isPracticeCheckInCustomId = (customId: string): boolean => {
  return customId.startsWith(PRACTICE_CHECK_IN_PREFIX);
};

export const practiceCommandJson =
  practiceCommand.data.toJSON() satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;

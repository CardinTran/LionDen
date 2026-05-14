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
  recordPracticeAttendance,
  recordPracticeRsvp,
  startPracticeSession
} from "../../features/practice/practice.service.js";
import { prisma } from "../../lib/prisma.js";
import type { SlashCommand } from "./ping.js";

const PRACTICE_RSVP_PREFIX = "practice:rsvp:";
const PRACTICE_ATTENDANCE_PREFIX = "practice:attendance:";

export const buildPracticeRsvpCustomId = (
  sessionId: string,
  rsvpStatus: "GOING" | "LATE" | "LEAVING_EARLY" | "NOT_GOING"
): string => {
  return `${PRACTICE_RSVP_PREFIX}${rsvpStatus}:${sessionId}`;
};

export const buildPracticeAttendanceCustomId = (
  sessionId: string,
  attendanceStatus: "HERE" | "NOT_HERE"
): string => {
  return `${PRACTICE_ATTENDANCE_PREFIX}${attendanceStatus}:${sessionId}`;
};

export const buildPracticeAttendanceComponents = (
  sessionId: string,
  disabled = false
): ActionRowBuilder<ButtonBuilder>[] => {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(buildPracticeRsvpCustomId(sessionId, "GOING"))
        .setLabel("Going")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId(buildPracticeRsvpCustomId(sessionId, "LATE"))
        .setLabel("Late")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId(buildPracticeRsvpCustomId(sessionId, "LEAVING_EARLY"))
        .setLabel("Leaving Early")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId(buildPracticeRsvpCustomId(sessionId, "NOT_GOING"))
        .setLabel("Not Going")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(disabled)
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(buildPracticeAttendanceCustomId(sessionId, "HERE"))
        .setLabel(disabled ? "Attendance Closed" : "I'm Here")
        .setStyle(ButtonStyle.Success)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId(buildPracticeAttendanceCustomId(sessionId, "NOT_HERE"))
        .setLabel(disabled ? "Attendance Closed" : "Not Here")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled)
    )
  ];
};

export const formatPracticeAnnouncementMessage = (input: {
  startedByDisplayName: string;
}): string => {
  return [
    "LionDen practice attendance is live.",
    `Started by ${input.startedByDisplayName}.`,
    "Use the RSVP buttons for planning.",
    "Use `I'm Here` or `Not Here` as the actual attendance record."
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
        components: buildPracticeAttendanceComponents(result.session.id)
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
              "Practice attendance is now closed."
            ].join("\n"),
            components: buildPracticeAttendanceComponents(result.session.id, true)
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
  const parts = interaction.customId.split(":");

  if (!guildId || parts.length !== 4) {
    await interaction.reply({
      content: "This practice button is no longer valid.",
      ephemeral: true
    });
    return;
  }

  const [, kind, state, sessionId] = parts;
  const displayName = interaction.user.username;

  if (kind === "rsvp") {
    const result = await recordPracticeRsvp(prisma, {
      sessionId,
      guildId,
      userId: interaction.user.id,
      displayName,
      rsvpStatus: state as "GOING" | "LATE" | "LEAVING_EARLY" | "NOT_GOING"
    });

    if (result.outcome === "session_closed") {
      await interaction.reply({
        content: "This practice session is closed.",
        ephemeral: true
      });
      return;
    }

    const labelMap = {
      GOING: "Going",
      LATE: "Late",
      LEAVING_EARLY: "Leaving Early",
      NOT_GOING: "Not Going"
    } as const;

    await interaction.reply({
      content: `Your RSVP is set to ${labelMap[state as keyof typeof labelMap]}. Current attendance count: ${result.checkInCount}.`,
      ephemeral: true
    });
    return;
  }

  const result = await recordPracticeAttendance(prisma, {
    sessionId,
    guildId,
    userId: interaction.user.id,
    displayName,
    attendanceStatus: state as "HERE" | "NOT_HERE"
  });

  if (result.outcome === "session_closed") {
    await interaction.reply({
      content: "This practice session is closed.",
      ephemeral: true
    });
    return;
  }

  const message =
    state === "HERE"
      ? `You're marked as here. Current attendance: ${result.checkInCount}.`
      : `You're marked as not here. Current attendance: ${result.checkInCount}.`;

  await interaction.reply({
    content: message,
    ephemeral: true
  });
};

export const isPracticeCheckInCustomId = (customId: string): boolean => {
  return (
    customId.startsWith(PRACTICE_RSVP_PREFIX) ||
    customId.startsWith(PRACTICE_ATTENDANCE_PREFIX)
  );
};

export const practiceCommandJson =
  practiceCommand.data.toJSON() satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;

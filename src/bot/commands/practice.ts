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
  attachPracticeAttendanceMessage,
  attachPracticeRsvpMessage,
  endPracticeSession,
  PRACTICE_ATTENDANCE_XP,
  recordPracticeAttendance,
  recordPracticeRsvp,
  startPracticeSession,
  upsertPracticeSchedule
} from "../../features/practice/practice.service.js";
import {
  getUserPracticeStreaks,
  listPracticeAttendanceLeaderboard,
  listUserPracticeAttendanceHistory
} from "../../features/practice/practice-attendance.service.js";
import {
  formatPracticeAttendanceHistoryMessage,
  formatPracticeAttendanceLeaderboardMessage,
  formatPracticeStreaksMessage,
  parsePracticeAttendancePeriod
} from "../../features/practice/practice-attendance-formatting.js";
import {
  backfillPracticeBadges,
  listUserPracticeBadges
} from "../../features/practice/practice-badge.service.js";
import {
  formatCompactPracticeBadgeSummary,
  formatPracticeBadgeListMessage,
  formatPracticeBadgeSyncSummaryMessage
} from "../../features/practice/practice-badge-formatting.js";
import {
  getLatestPracticeRecap,
  getPracticeRecapForSession
} from "../../features/practice/practice-recap.service.js";
import {
  autoPostPracticeRecapAfterEnd,
  type PracticeRecapAutoPostOutcome
} from "../../features/practice/practice-recap-autopost.service.js";
import {
  formatNoPracticeRecapMessage,
  formatPracticeRecapMessage
} from "../../features/practice/practice-recap-formatting.js";
import { recordWeeklyChallengeProgressSafely } from "../../features/challenges/weekly-challenge-hooks.js";
import { prisma } from "../../lib/prisma.js";
import type { SlashCommand } from "./types.js";

const PRACTICE_RSVP_PREFIX = "practice:rsvp:";
const PRACTICE_ATTENDANCE_PREFIX = "practice:attendance:";

export const buildPracticeRsvpCustomId = (
  sessionId: string,
  rsvpStatus: "GOING" | "LATE" | "LEAVING_EARLY" | "NOT_GOING"
): string => `${PRACTICE_RSVP_PREFIX}${rsvpStatus}:${sessionId}`;

export const buildPracticeAttendanceCustomId = (
  sessionId: string,
  attendanceStatus: "HERE" | "NOT_HERE"
): string => `${PRACTICE_ATTENDANCE_PREFIX}${attendanceStatus}:${sessionId}`;

export const buildPracticeRsvpComponents = (
  sessionId: string,
  disabled = false
): ActionRowBuilder<ButtonBuilder>[] => [
  new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildPracticeRsvpCustomId(sessionId, "GOING"))
      .setLabel("Going")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(buildPracticeRsvpCustomId(sessionId, "NOT_GOING"))
      .setLabel("Not Going")
      .setStyle(ButtonStyle.Danger)
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
      .setDisabled(disabled)
  )
];

export const buildPracticeAttendanceComponents = (
  sessionId: string,
  disabled = false
): ActionRowBuilder<ButtonBuilder>[] => [
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

export const formatPracticeRsvpMessage = (input: {
  startedByDisplayName: string;
}): string =>
  [
    "LionDen practice RSVP is open.",
    `Started by ${input.startedByDisplayName}.`,
    "Use these buttons for planning only."
  ].join("\n");

export const formatPracticeAttendanceMessage = (input: {
  startedByDisplayName: string;
}): string =>
  [
    "LionDen practice attendance is open.",
    `Started by ${input.startedByDisplayName}.`,
    "Use `I'm Here` or `Not Here` as the official attendance record."
  ].join("\n");

const requireManageGuild = async (
  interaction: ChatInputCommandInteraction
): Promise<boolean> => {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({
      content: "You do not have permission to manage practice sessions.",
      ephemeral: true
    });
    return false;
  }

  return true;
};

const getDisplayName = (interaction: ChatInputCommandInteraction): string =>
  interaction.member && "displayName" in interaction.member
    ? interaction.member.displayName
    : interaction.user.username;

const formatPracticeEndAutoPostSuffix = (
  outcome: PracticeRecapAutoPostOutcome
): string => {
  switch (outcome.outcome) {
    case "posted":
    case "posted_untracked":
      return " Practice recap posted.";
    case "skipped_duplicate":
      return " Practice recap was already posted.";
    case "skipped_missing_channel":
    case "skipped_no_recap":
    case "failed":
      return " Recap auto-post could not be sent.";
  }
};

export const practiceCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("practice")
    .setDescription("Manage LionDen practice attendance sessions.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("configure")
        .setDescription("Set the current channel as the scheduled practice channel.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("start")
        .setDescription(
          "Start a manual practice session and post RSVP plus attendance messages in this channel."
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("end")
        .setDescription("End the active practice attendance session.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("history")
        .setDescription("View recent practice attendance history.")
        .addUserOption((option) =>
          option
            .setName("member")
            .setDescription("Optional member whose practice history to view.")
        )
        .addIntegerOption((option) =>
          option
            .setName("limit")
            .setDescription("Number of recent practices to show, up to 25.")
            .setMinValue(1)
            .setMaxValue(25)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("leaderboard")
        .setDescription("View top practice attendees.")
        .addStringOption((option) =>
          option
            .setName("period")
            .setDescription("Attendance period.")
            .addChoices(
              {
                name: "Current month",
                value: "current_month"
              },
              {
                name: "Last 30 days",
                value: "last_30_days"
              },
              {
                name: "All time",
                value: "all_time"
              }
            )
        )
        .addIntegerOption((option) =>
          option
            .setName("limit")
            .setDescription("Number of members to show, up to 25.")
            .setMinValue(1)
            .setMaxValue(25)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("streaks")
        .setDescription("View practice attendance streaks.")
        .addUserOption((option) =>
          option
            .setName("member")
            .setDescription("Optional member whose practice streaks to view.")
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("badges")
        .setDescription("View earned practice badges.")
        .addUserOption((option) =>
          option
            .setName("member")
            .setDescription("Optional member whose practice badges to view.")
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("badge-sync")
        .setDescription("Sync and backfill practice badges from attendance history.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("recap")
        .setDescription("Post a recap for a completed practice session.")
        .addStringOption((option) =>
          option
            .setName("session_id")
            .setDescription(
              "Optional practice session ID. Defaults to the latest completed practice."
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

    const subcommand = interaction.options.getSubcommand(true);

    if (subcommand === "history") {
      const member = interaction.options.getUser("member") ?? interaction.user;
      const view = await listUserPracticeAttendanceHistory(prisma, {
        guildId,
        userId: member.id,
        now: new Date(),
        limit: interaction.options.getInteger("limit")
      });

      await interaction.reply({
        content: formatPracticeAttendanceHistoryMessage({
          displayName:
            member.id === interaction.user.id
              ? getDisplayName(interaction)
              : `<@${member.id}>`,
          ...view
        }),
        ephemeral: true
      });
      return;
    }

    if (subcommand === "leaderboard") {
      const leaderboard = await listPracticeAttendanceLeaderboard(prisma, {
        guildId,
        now: new Date(),
        period: parsePracticeAttendancePeriod(
          interaction.options.getString("period")
        ),
        limit: interaction.options.getInteger("limit")
      });

      await interaction.reply({
        content: formatPracticeAttendanceLeaderboardMessage(leaderboard),
        ephemeral: true
      });
      return;
    }

    if (subcommand === "streaks") {
      const member = interaction.options.getUser("member") ?? interaction.user;
      const [streaks, badges] = await Promise.all([
        getUserPracticeStreaks(prisma, {
          guildId,
          userId: member.id,
          now: new Date()
        }),
        listUserPracticeBadges(prisma, {
          guildId,
          userId: member.id
        })
      ]);
      const badgeSummary = formatCompactPracticeBadgeSummary(badges);

      await interaction.reply({
        content: [
          formatPracticeStreaksMessage({
            displayName:
              member.id === interaction.user.id
                ? getDisplayName(interaction)
                : `<@${member.id}>`,
            streaks
          }),
          badgeSummary
        ]
          .filter(Boolean)
          .join("\n"),
        ephemeral: true
      });
      return;
    }

    if (subcommand === "badges") {
      const member = interaction.options.getUser("member") ?? interaction.user;
      const badges = await listUserPracticeBadges(prisma, {
        guildId,
        userId: member.id
      });

      await interaction.reply({
        content: formatPracticeBadgeListMessage({
          displayName:
            member.id === interaction.user.id
              ? getDisplayName(interaction)
              : `<@${member.id}>`,
          badges
        }),
        ephemeral: true
      });
      return;
    }

    if (!(await requireManageGuild(interaction))) {
      return;
    }

    if (subcommand === "badge-sync") {
      const summary = await backfillPracticeBadges(prisma, {
        guildId,
        now: new Date()
      });

      await interaction.reply({
        content: formatPracticeBadgeSyncSummaryMessage(summary),
        ephemeral: true
      });
      return;
    }

    if (subcommand === "recap") {
      const sessionId = interaction.options.getString("session_id");
      const recap = sessionId
        ? await getPracticeRecapForSession(prisma, {
            guildId,
            sessionId,
            now: new Date()
          })
        : await getLatestPracticeRecap(prisma, {
            guildId,
            now: new Date()
          });

      if (!recap) {
        await interaction.reply({
          content: formatNoPracticeRecapMessage(),
          ephemeral: true
        });
        return;
      }

      await interaction.reply({
        content: formatPracticeRecapMessage(recap)
      });
      return;
    }

    const channel = interaction.channel;

    if (
      !channel ||
      !channel.isTextBased() ||
      channel.type === ChannelType.DM ||
      !("send" in channel)
    ) {
      await interaction.reply({
        content:
          "Practice commands must be run from a server text channel where LionDen can post messages.",
        ephemeral: true
      });
      return;
    }

    if (subcommand === "configure") {
      await upsertPracticeSchedule(prisma, {
        guildId,
        channelId: channel.id,
        timezone: "America/Chicago",
        enabled: true
      });

      await interaction.reply({
        content:
          "Scheduled practice posts are configured for this channel. LionDen will use the fixed weekly schedule in Central Time.",
        ephemeral: true
      });
      return;
    }

    if (subcommand === "start") {
      const result = await startPracticeSession(prisma, {
        guildId,
        startedByUserId: interaction.user.id,
        startedByDisplayName: interaction.user.username,
        channelId: channel.id
      });

      if (result.outcome === "already_active") {
        await interaction.reply({
          content: `A practice session is already active in <#${result.session.announcementChannelId}>.`,
          ephemeral: true
        });
        return;
      }

      const rsvpMessage = await channel.send({
        content: formatPracticeRsvpMessage({
          startedByDisplayName: interaction.user.username
        }),
        components: buildPracticeRsvpComponents(result.session.id)
      });

      const attendanceMessage = await channel.send({
        content: formatPracticeAttendanceMessage({
          startedByDisplayName: interaction.user.username
        }),
        components: buildPracticeAttendanceComponents(result.session.id)
      });

      await attachPracticeRsvpMessage(prisma, {
        sessionId: result.session.id,
        rsvpMessageId: rsvpMessage.id
      });
      await attachPracticeAttendanceMessage(prisma, {
        sessionId: result.session.id,
        attendanceMessageId: attendanceMessage.id,
        activate: false
      });

      await upsertPracticeSchedule(prisma, {
        guildId,
        channelId: channel.id,
        timezone: "America/Chicago",
        enabled: true
      });

      await interaction.reply({
        content: `Manual practice session started in <#${channel.id}> with separate RSVP and attendance posts.`,
        ephemeral: true
      });
      return;
    }

    const endedAt = new Date();
    const result = await endPracticeSession(prisma, {
      guildId,
      endedByUserId: interaction.user.id,
      endedAt
    });

    if (!result) {
      await interaction.reply({
        content: "There is no active practice session to end.",
        ephemeral: true
      });
      return;
    }

    try {
      const fetchedChannel = await interaction.client.channels.fetch(
        result.session.announcementChannelId
      );

      if (fetchedChannel && fetchedChannel.isTextBased() && "messages" in fetchedChannel) {
        if (result.session.rsvpMessageId) {
          const rsvpMessage = await fetchedChannel.messages.fetch(result.session.rsvpMessageId);

          await rsvpMessage.edit({
            content: [
              formatPracticeRsvpMessage({
                startedByDisplayName: result.session.startedByDisplayName
              }),
              "",
              "Practice RSVP is now closed."
            ].join("\n"),
            components: buildPracticeRsvpComponents(result.session.id, true)
          });
        }

        if (result.session.attendanceMessageId) {
          const attendanceMessage = await fetchedChannel.messages.fetch(
            result.session.attendanceMessageId
          );

          await attendanceMessage.edit({
            content: [
              formatPracticeAttendanceMessage({
                startedByDisplayName: result.session.startedByDisplayName
              }),
              "",
              "Practice attendance is now closed."
            ].join("\n"),
            components: buildPracticeAttendanceComponents(result.session.id, true)
          });
        }
      }
    } catch {
      // Best-effort update only; the session is already closed in the database.
    }

    const autoPostResult = await autoPostPracticeRecapAfterEnd(prisma, {
      guildId,
      practiceId: result.session.id,
      session: result.session,
      now: endedAt,
      commandChannel: channel,
      client: interaction.client
    });

    await interaction.reply({
      content: `Practice session ended with ${result.checkInCount} member${result.checkInCount === 1 ? "" : "s"} marked here. Awarded ${PRACTICE_ATTENDANCE_XP} XP to ${result.rewardedCount} attendee${result.rewardedCount === 1 ? "" : "s"}.${formatPracticeEndAutoPostSuffix(autoPostResult)}`,
      ephemeral: true
    });
  }
};

export const handlePracticeButton = async (
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
      NOT_GOING: "Not Going",
      LATE: "Late",
      LEAVING_EARLY: "Leaving Early"
    } as const;

    await interaction.reply({
      content: `Your RSVP is set to ${labelMap[state as keyof typeof labelMap]}. Members currently marked here: ${result.checkInCount}.`,
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

  if (state === "HERE") {
    await recordWeeklyChallengeProgressSafely(prisma, {
      guildId,
      userId: interaction.user.id,
      displayName,
      activityType: "PRACTICE_ATTENDANCE",
      occurredAt: new Date()
    });
  }

  await interaction.reply({
    content:
      state === "HERE"
        ? `You're marked as here. Current attendance: ${result.checkInCount}.`
        : `You're marked as not here. Current attendance: ${result.checkInCount}.`,
    ephemeral: true
  });
};

export const isPracticeButtonCustomId = (customId: string): boolean =>
  customId.startsWith(PRACTICE_RSVP_PREFIX) ||
  customId.startsWith(PRACTICE_ATTENDANCE_PREFIX);

export const practiceCommandJson =
  practiceCommand.data.toJSON() satisfies RESTPostAPIChatInputApplicationCommandsJSONBody;

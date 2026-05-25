import type { Client } from "discord.js";

import { logger } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";
import { isMaintenanceModeEnabled } from "../admin/bot-config.service.js";
import {
  attachPracticeAttendanceMessage,
  attachPracticeRsvpMessage,
  getActivePracticeSession,
  getOrCreateScheduledPracticeSession,
  listEnabledPracticeSchedules
} from "./practice.service.js";
import {
  buildPracticeAttendanceComponents,
  buildPracticeRsvpComponents,
  formatPracticeAttendanceMessage,
  formatPracticeRsvpMessage
} from "../../bot/commands/practice.js";

const PRACTICE_TIMEZONE = "America/Chicago";
const RSVP_DAYS = new Set([0, 2, 4]);
const ATTENDANCE_DAYS = new Set([1, 3, 5]);
const POST_HOUR = 17;
const POST_MINUTE = 0;
const SCHEDULER_USER_ID = "lionden-scheduler";
const SCHEDULER_DISPLAY_NAME = "LionDen Scheduler";

let schedulerTimer: ReturnType<typeof setInterval> | null = null;

interface LocalTimeParts {
  weekday: number;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

const getLocalTimeParts = (date: Date, timeZone: string): LocalTimeParts => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const lookup = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6
  };

  return {
    weekday: weekdayMap[lookup.weekday ?? "Sun"] ?? 0,
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    hour: Number(lookup.hour),
    minute: Number(lookup.minute)
  };
};

const getDateKey = (
  parts: Pick<LocalTimeParts, "year" | "month" | "day">
): string =>
  `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;

const getNextPracticeDateKeyFromRsvpDay = (
  parts: LocalTimeParts
): string | null => {
  const offsetByDay: Record<number, number> = {
    0: 1,
    2: 1,
    4: 1
  };
  const offsetDays = offsetByDay[parts.weekday];

  if (!offsetDays) {
    return null;
  }

  const utcDate = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day + offsetDays)
  );
  return getDateKey({
    year: utcDate.getUTCFullYear(),
    month: utcDate.getUTCMonth() + 1,
    day: utcDate.getUTCDate()
  });
};

const fetchConfiguredChannel = async (
  client: Client,
  channelId: string
): Promise<
  | ({
      send: (...args: unknown[]) => Promise<{ id: string }>;
      messages: {
        fetch: (...args: unknown[]) => Promise<{ id: string }>;
      };
    } & object)
  | null
> => {
  const channel = await client.channels.fetch(channelId);

  if (!channel || !channel.isTextBased() || !("send" in channel)) {
    return null;
  }

  return channel as {
    send: (...args: unknown[]) => Promise<{ id: string }>;
    messages: {
      fetch: (...args: unknown[]) => Promise<{ id: string }>;
    };
  };
};

const maybePostScheduledRsvp = async (
  client: Client,
  now: Date
): Promise<void> => {
  const localNow = getLocalTimeParts(now, PRACTICE_TIMEZONE);

  if (
    !RSVP_DAYS.has(localNow.weekday) ||
    localNow.hour !== POST_HOUR ||
    localNow.minute !== POST_MINUTE
  ) {
    return;
  }

  const scheduledDateKey = getNextPracticeDateKeyFromRsvpDay(localNow);

  if (!scheduledDateKey) {
    return;
  }

  const schedules = await listEnabledPracticeSchedules(prisma);

  for (const schedule of schedules) {
    if (await isMaintenanceModeEnabled(prisma, schedule.guildId)) {
      logger.info("Practice scheduler skipped guild in maintenance", {
        guildId: schedule.guildId,
        postType: "rsvp"
      });
      continue;
    }

    if (!schedule.channelId) {
      continue;
    }

    const activeSession = await getActivePracticeSession(
      prisma,
      schedule.guildId
    );

    if (activeSession) {
      continue;
    }

    const session = await getOrCreateScheduledPracticeSession(prisma, {
      guildId: schedule.guildId,
      channelId: schedule.channelId,
      startedByUserId: SCHEDULER_USER_ID,
      startedByDisplayName: SCHEDULER_DISPLAY_NAME,
      scheduledDateKey
    });

    if (session.rsvpMessageId) {
      continue;
    }

    const channel = await fetchConfiguredChannel(client, schedule.channelId);

    if (!channel) {
      logger.warn("Practice scheduler could not fetch configured channel", {
        guildId: schedule.guildId,
        channelId: schedule.channelId,
        postType: "rsvp"
      });
      continue;
    }

    const message = await channel.send({
      content: formatPracticeRsvpMessage({
        startedByDisplayName: SCHEDULER_DISPLAY_NAME
      }),
      components: buildPracticeRsvpComponents(session.id)
    });

    await attachPracticeRsvpMessage(prisma, {
      sessionId: session.id,
      rsvpMessageId: message.id
    });
    logger.info("Practice scheduler posted RSVP", {
      guildId: schedule.guildId,
      channelId: schedule.channelId,
      sessionId: session.id,
      scheduledDateKey
    });
  }
};

const maybePostScheduledAttendance = async (
  client: Client,
  now: Date
): Promise<void> => {
  const localNow = getLocalTimeParts(now, PRACTICE_TIMEZONE);

  if (
    !ATTENDANCE_DAYS.has(localNow.weekday) ||
    localNow.hour !== POST_HOUR ||
    localNow.minute !== POST_MINUTE
  ) {
    return;
  }

  const scheduledDateKey = getDateKey(localNow);
  const schedules = await listEnabledPracticeSchedules(prisma);

  for (const schedule of schedules) {
    if (await isMaintenanceModeEnabled(prisma, schedule.guildId)) {
      logger.info("Practice scheduler skipped guild in maintenance", {
        guildId: schedule.guildId,
        postType: "attendance"
      });
      continue;
    }

    if (!schedule.channelId) {
      continue;
    }

    const activeSession = await getActivePracticeSession(
      prisma,
      schedule.guildId
    );

    if (activeSession) {
      continue;
    }

    const session = await getOrCreateScheduledPracticeSession(prisma, {
      guildId: schedule.guildId,
      channelId: schedule.channelId,
      startedByUserId: SCHEDULER_USER_ID,
      startedByDisplayName: SCHEDULER_DISPLAY_NAME,
      scheduledDateKey
    });

    if (session.attendanceMessageId) {
      continue;
    }

    const channel = await fetchConfiguredChannel(client, schedule.channelId);

    if (!channel) {
      logger.warn("Practice scheduler could not fetch configured channel", {
        guildId: schedule.guildId,
        channelId: schedule.channelId,
        postType: "attendance"
      });
      continue;
    }

    const message = await channel.send({
      content: formatPracticeAttendanceMessage({
        startedByDisplayName: SCHEDULER_DISPLAY_NAME
      }),
      components: buildPracticeAttendanceComponents(session.id)
    });

    await attachPracticeAttendanceMessage(prisma, {
      sessionId: session.id,
      attendanceMessageId: message.id,
      activate: true
    });
    logger.info("Practice scheduler posted attendance", {
      guildId: schedule.guildId,
      channelId: schedule.channelId,
      sessionId: session.id,
      scheduledDateKey
    });
  }
};

export const runPracticeSchedulerTick = async (
  client: Client
): Promise<void> => {
  const now = new Date();

  await maybePostScheduledRsvp(client, now);
  await maybePostScheduledAttendance(client, now);
};

export const startPracticeScheduler = (client: Client): void => {
  if (schedulerTimer) {
    logger.warn("Practice scheduler already running");
    return;
  }

  logger.info("Starting practice scheduler", {
    intervalMs: 60_000
  });

  void runPracticeSchedulerTick(client).catch((error) => {
    logger.error("Initial practice scheduler tick failed", { error });
  });

  schedulerTimer = setInterval(() => {
    void runPracticeSchedulerTick(client).catch((error) => {
      logger.error("Practice scheduler tick failed", { error });
    });
  }, 60_000);
};

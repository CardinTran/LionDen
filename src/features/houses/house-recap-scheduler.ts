import type { Client } from "discord.js";

import { logger } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";
import { formatWeeklyHouseRecap } from "./house-recap-formatting.js";
import {
  buildWeeklyHouseRecap,
  getCurrentHouseRecapWeekKey,
  listEnabledHouseRecapConfigs,
  recordHouseRecapPost,
  shouldSkipAlreadyPostedWeek,
  type HouseRecapConfigRecord,
  type HouseRecapPostRecord,
  type HouseRecapStore
} from "./house-recap.service.js";

let schedulerTimer: ReturnType<typeof setInterval> | null = null;

type SendableChannel = {
  id: string;
  send(args: { content: string }): Promise<{ id: string }>;
};

interface LocalTimeParts {
  weekday: number;
  hour: number;
  minute: number;
}

const getLocalTimeParts = (date: Date, timeZone: string): LocalTimeParts => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
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
    hour: Number(lookup.hour),
    minute: Number(lookup.minute)
  };
};

export const isHouseRecapDue = (
  config: Pick<
    HouseRecapConfigRecord,
    "weekday" | "hour" | "minute" | "timezone"
  >,
  now: Date
): boolean => {
  const localNow = getLocalTimeParts(now, config.timezone);

  return (
    localNow.weekday === config.weekday &&
    localNow.hour === config.hour &&
    localNow.minute === config.minute
  );
};

export const fetchHouseRecapChannel = async (
  client: Client,
  channelId: string
): Promise<SendableChannel | null> => {
  const channel = await client.channels.fetch(channelId);

  if (!channel || !channel.isTextBased() || !("send" in channel)) {
    return null;
  }

  return channel as SendableChannel;
};

export type PostWeeklyHouseRecapResult =
  | {
      outcome: "posted";
      weekKey: string;
      messageId: string;
      post: HouseRecapPostRecord | null;
      alreadyPosted: HouseRecapPostRecord | null;
    }
  | {
      outcome: "posted_unrecorded";
      weekKey: string;
      messageId: string;
      post: null;
      alreadyPosted: HouseRecapPostRecord | null;
    }
  | {
      outcome: "skipped_duplicate";
      weekKey: string;
      messageId: null;
      post: HouseRecapPostRecord;
      alreadyPosted: HouseRecapPostRecord;
    };

export const postWeeklyHouseRecap = async (
  store: HouseRecapStore,
  input: {
    guildId: string;
    channel: SendableChannel;
    now: Date;
    force?: boolean;
  }
): Promise<PostWeeklyHouseRecapResult> => {
  const weekKey = getCurrentHouseRecapWeekKey(input.now);
  const alreadyPosted = await shouldSkipAlreadyPostedWeek(store, {
    guildId: input.guildId,
    weekKey
  });

  if (alreadyPosted && !input.force) {
    logger.info("Skipped duplicate Weekly House Recap", {
      guildId: input.guildId,
      channelId: input.channel.id,
      weekKey
    });

    return {
      outcome: "skipped_duplicate",
      weekKey,
      messageId: null,
      post: alreadyPosted,
      alreadyPosted
    };
  }

  const recap = await buildWeeklyHouseRecap(store, {
    guildId: input.guildId,
    weekKey
  });
  const message = await input.channel.send({
    content: formatWeeklyHouseRecap(recap)
  });

  if (alreadyPosted && input.force) {
    logger.info("Posted forced Weekly House Recap repost", {
      guildId: input.guildId,
      channelId: input.channel.id,
      weekKey,
      messageId: message.id
    });

    return {
      outcome: "posted",
      weekKey,
      messageId: message.id,
      post: null,
      alreadyPosted
    };
  }

  try {
    const post = await recordHouseRecapPost(store, {
      guildId: input.guildId,
      weekKey,
      channelId: input.channel.id,
      messageId: message.id,
      postedAt: input.now
    });

    logger.info("Posted Weekly House Recap", {
      guildId: input.guildId,
      channelId: input.channel.id,
      weekKey,
      messageId: message.id
    });

    return {
      outcome: "posted",
      weekKey,
      messageId: message.id,
      post,
      alreadyPosted: null
    };
  } catch (error) {
    logger.error("Weekly House Recap post recording failed", {
      guildId: input.guildId,
      channelId: input.channel.id,
      weekKey,
      messageId: message.id,
      error
    });

    return {
      outcome: "posted_unrecorded",
      weekKey,
      messageId: message.id,
      post: null,
      alreadyPosted: null
    };
  }
};

export const postWeeklyHouseRecapNow = postWeeklyHouseRecap;

export const runHouseRecapSchedulerTick = async (
  client: Client,
  now = new Date()
): Promise<void> => {
  const configs = await listEnabledHouseRecapConfigs(prisma);

  for (const config of configs) {
    try {
      if (!config.channelId) {
        logger.warn("Weekly House Recap config enabled without channel", {
          guildId: config.guildId
        });
        continue;
      }

      if (!isHouseRecapDue(config, now)) {
        continue;
      }

      const channel = await fetchHouseRecapChannel(client, config.channelId);

      if (!channel) {
        logger.warn("Weekly House Recap channel unavailable", {
          guildId: config.guildId,
          channelId: config.channelId
        });
        continue;
      }

      await postWeeklyHouseRecap(prisma, {
        guildId: config.guildId,
        channel,
        now
      });
    } catch (error) {
      logger.error("Weekly House Recap scheduler config failed", {
        guildId: config.guildId,
        channelId: config.channelId,
        error
      });
    }
  }
};

export const startHouseRecapScheduler = (client: Client): void => {
  if (schedulerTimer) {
    return;
  }

  logger.info("Weekly House Recap scheduler started");

  void runHouseRecapSchedulerTick(client).catch((error) => {
    logger.error("Initial Weekly House Recap scheduler tick failed", { error });
  });

  schedulerTimer = setInterval(() => {
    void runHouseRecapSchedulerTick(client).catch((error) => {
      logger.error("Weekly House Recap scheduler tick failed", { error });
    });
  }, 60_000);
};

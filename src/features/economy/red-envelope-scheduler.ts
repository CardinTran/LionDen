import type { Client } from "discord.js";

import { logger } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";
import {
  attachRedEnvelopeMessage,
  createRedEnvelope,
  generateRandomDrop,
  getOpenRedEnvelopeForGuild,
  listEnabledRedEnvelopeDropConfigs,
  updateRedEnvelopeDropSchedule
} from "./red-envelope.service.js";
import { listMostActiveChannels } from "./channel-activity.service.js";
import {
  formatRedEnvelopeMessage
} from "../../bot/commands/redenvelope.js";

let schedulerTimer: ReturnType<typeof setInterval> | null = null;

const SCHEDULER_USER_ID = "lionden-red-envelope-scheduler";
const SCHEDULER_DISPLAY_NAME = "LionDen Red Envelope";

const fetchConfiguredChannel = async (
  client: Client,
  channelId: string
): Promise<
  | ({
      send: (...args: unknown[]) => Promise<{ id: string }>;
    } & object)
  | null
> => {
  const channel = await client.channels.fetch(channelId);

  if (!channel || !channel.isTextBased() || !("send" in channel)) {
    return null;
  }

  return channel as {
    send: (...args: unknown[]) => Promise<{ id: string }>;
  };
};

export const resolveDropChannel = async (
  client: Client,
  input: {
    guildId: string;
    fallbackChannelId: string;
    now: Date;
  }
): Promise<
  | {
      channel: {
        id: string;
        send: (...args: unknown[]) => Promise<{ id: string }>;
      };
      usedActiveTargeting: boolean;
    }
  | null
> => {
  const activeChannels = listMostActiveChannels({
    guildId: input.guildId,
    now: input.now
  });

  for (const activityEntry of activeChannels) {
    const channel = await fetchConfiguredChannel(client, activityEntry.channelId);

    if (channel) {
      return {
        channel: {
          ...channel,
          id: activityEntry.channelId
        },
        usedActiveTargeting: true
      };
    }
  }

  const fallbackChannel = await fetchConfiguredChannel(client, input.fallbackChannelId);

  if (!fallbackChannel) {
    return null;
  }

  return {
    channel: {
      ...fallbackChannel,
      id: input.fallbackChannelId
    },
    usedActiveTargeting: false
  };
};

export const runRedEnvelopeSchedulerTick = async (
  client: Client,
  now = new Date()
): Promise<void> => {
  const configs = await listEnabledRedEnvelopeDropConfigs(prisma);

  for (const config of configs) {
    if (!config.nextDropAt || config.nextDropAt.getTime() > now.getTime()) {
      continue;
    }

    const openEnvelope = await getOpenRedEnvelopeForGuild(prisma, config.guildId);

    if (openEnvelope) {
      continue;
    }

    const resolvedChannel = await resolveDropChannel(client, {
      guildId: config.guildId,
      fallbackChannelId: config.channelId,
      now
    });

    if (!resolvedChannel) {
      continue;
    }

    const generation = generateRandomDrop({
      config,
      now,
      random: Math.random
    });

    const envelope = await createRedEnvelope(prisma, {
      guildId: config.guildId,
      channelId: resolvedChannel.channel.id,
      createdByUserId: SCHEDULER_USER_ID,
      createdByDisplayName: SCHEDULER_DISPLAY_NAME,
      amount: generation.amount
    });

    const message = await resolvedChannel.channel.send({
      content: formatRedEnvelopeMessage({
        createdByDisplayName: SCHEDULER_DISPLAY_NAME,
        amount: generation.amount
      })
    });

    await attachRedEnvelopeMessage(prisma, {
      envelopeId: envelope.id,
      messageId: message.id
    });
    await updateRedEnvelopeDropSchedule(prisma, {
      guildId: config.guildId,
      lastDroppedAt: now,
      nextDropAt: generation.nextDropAt
    });

    logger.info("Posted random red envelope drop", {
      guildId: config.guildId,
      channelId: resolvedChannel.channel.id,
      usedActiveTargeting: resolvedChannel.usedActiveTargeting
    });
  }
};

export const startRedEnvelopeScheduler = (client: Client): void => {
  if (schedulerTimer) {
    return;
  }

  void runRedEnvelopeSchedulerTick(client).catch((error) => {
    logger.error("Initial red envelope scheduler tick failed", { error });
  });

  schedulerTimer = setInterval(() => {
    void runRedEnvelopeSchedulerTick(client).catch((error) => {
      logger.error("Red envelope scheduler tick failed", { error });
    });
  }, 60_000);
};

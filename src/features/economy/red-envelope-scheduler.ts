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
import {
  buildRedEnvelopeComponents,
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

    const channel = await fetchConfiguredChannel(client, config.channelId);

    if (!channel) {
      continue;
    }

    const generation = generateRandomDrop({
      config,
      now,
      random: Math.random
    });

    const envelope = await createRedEnvelope(prisma, {
      guildId: config.guildId,
      channelId: config.channelId,
      createdByUserId: SCHEDULER_USER_ID,
      createdByDisplayName: SCHEDULER_DISPLAY_NAME,
      amount: generation.amount
    });

    const message = await channel.send({
      content: formatRedEnvelopeMessage({
        createdByDisplayName: SCHEDULER_DISPLAY_NAME,
        amount: generation.amount
      }),
      components: buildRedEnvelopeComponents(envelope.id)
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

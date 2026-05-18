import { existsSync } from "node:fs";
import path from "node:path";

import type { Client } from "discord.js";

import { logger } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { isMaintenanceModeEnabled } from "../admin/bot-config.service.js";
import { listMostActiveChannels } from "../economy/channel-activity.service.js";
import {
  attachWildLionSpawnMessage,
  createWildLionSpawn,
  ensureLionSpawnConfig,
  expireActiveLionSpawns,
  generateNextLionSpawnAt,
  listActiveLionChannelEffects,
  listActiveWildLionSpawns,
  listEnabledLionSpawnConfigs,
  syncDefaultLionData,
  updateLionSpawnSchedule,
  type ActiveLionSpawnWithSpeciesRecord
} from "./lion-creature.service.js";
import { formatWildLionSpawnMessage } from "./lion-formatting.js";
import type { LionRarityValue } from "./lion-seed-data.js";

let schedulerTimer: ReturnType<typeof setInterval> | null = null;
let runtimeInitialized = false;

export const LION_SPAWN_MIN_ACTIVE_MESSAGES = 5;
export const LION_SPAWN_ACTIVITY_WINDOW_MINUTES = 60;

type SendableTextChannel = {
  id: string;
  send(args: { content: string; files?: string[] }): Promise<{ id: string }>;
};

const ensureLionRuntime = async (): Promise<void> => {
  if (runtimeInitialized) {
    return;
  }

  await syncDefaultLionData(prisma);
  await ensureLionSpawnConfig(prisma, {
    guildId: env.DISCORD_GUILD_ID,
    now: new Date(),
    random: Math.random
  });
  runtimeInitialized = true;
};

const getSpawnFiles = (spawn: ActiveLionSpawnWithSpeciesRecord): string[] => {
  const assetPath = path.join(process.cwd(), spawn.species.imagePath);

  if (!existsSync(assetPath)) {
    return [];
  }

  return [assetPath];
};

export const postWildLionSpawnToChannel = async (
  channel: SendableTextChannel,
  input: {
    guildId: string;
    now: Date;
    random: () => number;
    speciesPublicId?: string | null;
    rarity?: LionRarityValue | null;
    minLevel?: number | null;
    maxLevel?: number | null;
  }
): Promise<ActiveLionSpawnWithSpeciesRecord | null> => {
  await ensureLionRuntime();

  const result = await createWildLionSpawn(prisma, {
    guildId: input.guildId,
    channelId: channel.id,
    now: input.now,
    random: input.random,
    speciesPublicId: input.speciesPublicId,
    rarity: input.rarity,
    minLevel: input.minLevel,
    maxLevel: input.maxLevel
  });

  if (result.outcome !== "spawned" || !result.spawn) {
    return result.spawn;
  }

  const message = await channel.send({
    content: formatWildLionSpawnMessage({
      spawn: result.spawn
    }),
    files: getSpawnFiles(result.spawn)
  });

  return attachWildLionSpawnMessage(prisma, {
    spawnId: result.spawn.id,
    messageId: message.id
  });
};

const fetchSpawnChannel = async (
  client: Client,
  channelId: string
): Promise<SendableTextChannel | null> => {
  const channel = await client.channels.fetch(channelId);

  if (!channel || !channel.isTextBased() || !("send" in channel)) {
    return null;
  }

  return channel as SendableTextChannel;
};

export const resolveWildLionSpawnChannel = async (
  client: Client,
  input: {
    guildId: string;
    now: Date;
  }
): Promise<SendableTextChannel | null> => {
  const activeSpawnBoosts = await listActiveLionChannelEffects(prisma, {
    guildId: input.guildId,
    now: input.now,
    effectType: "SPAWN_BOOST"
  });

  for (const effect of activeSpawnBoosts) {
    const channel = await fetchSpawnChannel(client, effect.channelId);

    if (channel) {
      return channel;
    }
  }

  const activeChannels = listMostActiveChannels({
    guildId: input.guildId,
    now: input.now,
    windowMinutes: LION_SPAWN_ACTIVITY_WINDOW_MINUTES,
    minMessages: LION_SPAWN_MIN_ACTIVE_MESSAGES
  });

  for (const activityEntry of activeChannels) {
    const channel = await fetchSpawnChannel(client, activityEntry.channelId);

    if (channel) {
      return channel;
    }
  }

  return null;
};

export const runLionSpawnSchedulerTick = async (
  client: Client,
  now = new Date()
): Promise<void> => {
  await ensureLionRuntime();
  const configs = await listEnabledLionSpawnConfigs(prisma);

  for (const config of configs) {
    if (await isMaintenanceModeEnabled(prisma, config.guildId)) {
      continue;
    }

    await expireActiveLionSpawns(prisma, {
      guildId: config.guildId,
      now
    });

    if (!config.nextSpawnAt || config.nextSpawnAt.getTime() > now.getTime()) {
      continue;
    }

    const activeSpawns = await listActiveWildLionSpawns(prisma, {
      guildId: config.guildId,
      now
    });

    if (activeSpawns.length > 0) {
      continue;
    }

    const nextSpawnAt = generateNextLionSpawnAt({
      config,
      now,
      random: Math.random
    });
    const channel = await resolveWildLionSpawnChannel(client, {
      guildId: config.guildId,
      now
    });

    if (!channel) {
      await updateLionSpawnSchedule(prisma, {
        guildId: config.guildId,
        nextSpawnAt
      });
      continue;
    }

    const spawn = await postWildLionSpawnToChannel(channel, {
      guildId: config.guildId,
      now,
      random: Math.random
    });

    await updateLionSpawnSchedule(prisma, {
      guildId: config.guildId,
      lastSpawnedAt: spawn ? now : config.lastSpawnedAt,
      nextSpawnAt
    });

    if (spawn) {
      logger.info("Posted wild lion spawn", {
        guildId: config.guildId,
        channelId: channel.id,
        species: spawn.species.slug
      });
    }
  }
};

export const startLionSpawnScheduler = (client: Client): void => {
  if (schedulerTimer) {
    return;
  }

  void runLionSpawnSchedulerTick(client).catch((error) => {
    logger.error("Initial lion spawn scheduler tick failed", { error });
  });

  schedulerTimer = setInterval(() => {
    void runLionSpawnSchedulerTick(client).catch((error) => {
      logger.error("Lion spawn scheduler tick failed", { error });
    });
  }, 60_000);
};

import { Events, type Client } from "discord.js";

import { ensureBotGuildConfig } from "../../features/admin/bot-config.service.js";
import { startRedEnvelopeScheduler } from "../../features/economy/red-envelope-scheduler.js";
import { startHouseRecapScheduler } from "../../features/houses/house-recap-scheduler.js";
import { startLionSpawnScheduler } from "../../features/lions/lion-spawn-scheduler.js";
import { startPracticeScheduler } from "../../features/practice/practice-scheduler.js";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";
import { applyBotPresence } from "../presence.js";

export const registerReadyEvent = (client: Client): void => {
  client.once(Events.ClientReady, (readyClient) => {
    logger.info("Discord client ready", {
      tag: readyClient.user.tag
    });
    void (async () => {
      const config = await ensureBotGuildConfig(prisma, {
        guildId: env.DISCORD_GUILD_ID
      });

      applyBotPresence(client, config);
      startPracticeScheduler(client);
      startRedEnvelopeScheduler(client);
      startLionSpawnScheduler(client);
      startHouseRecapScheduler(client);
    })().catch((error) => {
      logger.error("Failed to initialize bot runtime controls", { error });
    });
  });
};

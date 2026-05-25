import { createDiscordClient } from "./bot/discordClient.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { prisma } from "./lib/prisma.js";

const start = async (): Promise<void> => {
  logger.info("Starting LionDen bot");
  await prisma.$connect();
  logger.info("Database connection established");
  const client = createDiscordClient();

  logger.info("Logging in to Discord");
  await client.login(env.DISCORD_TOKEN);
};

start().catch((error) => {
  logger.error("Failed to start LionDen", {
    error,
    hint:
      "If Prisma reports missing tables, stop the bot and run npm run prisma:migrate:deploy."
  });
  process.exitCode = 1;
});

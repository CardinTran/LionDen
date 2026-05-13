import { createDiscordClient } from "./bot/discordClient.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";

const start = async (): Promise<void> => {
  const client = createDiscordClient();

  await client.login(env.DISCORD_TOKEN);
};

start().catch((error) => {
  logger.error("Failed to start LionDen", { error });
  process.exitCode = 1;
});

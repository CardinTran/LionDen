import { registerGuildCommands } from "../bot/discordClient.js";
import { logger } from "../lib/logger.js";

registerGuildCommands().catch((error) => {
  logger.error("Failed to register slash commands", { error });
  process.exitCode = 1;
});

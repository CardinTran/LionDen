import {
  Client,
  GatewayIntentBits,
  REST,
  Routes
} from "discord.js";

import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { commands } from "./commands/index.js";
import { registerInteractionCreateEvent } from "./events/interactionCreate.js";
import { registerMessageCreateEvent } from "./events/messageCreate.js";
import { registerReadyEvent } from "./events/ready.js";

export const createDiscordClient = (): Client => {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ]
  });

  registerReadyEvent(client);
  registerInteractionCreateEvent(client);
  registerMessageCreateEvent(client);

  return client;
};

export const registerGuildCommands = async (): Promise<void> => {
  const rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(
      env.DISCORD_CLIENT_ID,
      env.DISCORD_GUILD_ID
    ),
    {
      body: commands.map((command) => command.data.toJSON())
    }
  );

  logger.info("Registered guild slash commands", {
    commandCount: commands.length
  });
};

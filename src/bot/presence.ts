import { ActivityType, type Client } from "discord.js";

import type { BotGuildConfigRecord } from "../features/admin/bot-config.service.js";

export const applyBotPresence = (
  client: Client,
  config?: Pick<BotGuildConfigRecord, "maintenanceMode"> | null
): void => {
  const maintenanceMode = config?.maintenanceMode ?? false;

  client.user?.setPresence({
    status: maintenanceMode ? "idle" : "online",
    activities: [
      {
        name: maintenanceMode ? "maintenance mode" : "wild lion spawns",
        type: maintenanceMode ? ActivityType.Watching : ActivityType.Playing
      }
    ]
  });
};

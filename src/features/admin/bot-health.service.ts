import { RED_ENVELOPE_EXPIRY_MINUTES } from "../economy/red-envelope.service.js";
import type { BotGuildConfigRecord } from "./bot-config.service.js";

export type HealthStatus = "healthy" | "warning" | "error";

export interface HealthCheckItem {
  label: string;
  status: HealthStatus;
  message: string;
  details?: Record<string, unknown>;
  error?: unknown;
}

export interface HealthSection {
  name: string;
  items: HealthCheckItem[];
}

export interface BotHealthReport {
  overallStatus: HealthStatus;
  sections: HealthSection[];
  notes: string[];
}

interface CountDelegate {
  count(args?: unknown): Promise<number>;
}

interface BotHealthStore {
  $queryRaw<T = unknown>(
    query: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T>;
  userProfile: {
    findFirst(args: unknown): Promise<{ id: string } | null>;
  };
  botGuildConfig: {
    findUnique(args: {
      where: {
        guildId: string;
      };
    }): Promise<BotGuildConfigRecord | null>;
  };
  practiceSchedule: {
    findUnique(args: unknown): Promise<{
      channelId: string | null;
      enabled: boolean;
      timezone: string;
    } | null>;
  };
  practiceSession: {
    findFirst(args: unknown): Promise<{
      id: string;
      announcementChannelId: string;
      source: string;
    } | null>;
  };
  redEnvelopeDropConfig: {
    findUnique(args: unknown): Promise<{
      channelId: string;
      enabled: boolean;
      nextDropAt: Date | null;
    } | null>;
  };
  redEnvelope: CountDelegate;
  lionSpawnConfig: {
    findUnique(args: unknown): Promise<{
      enabled: boolean;
      nextSpawnAt: Date | null;
    } | null>;
  };
  activeLionSpawn: CountDelegate;
}

export interface BotHealthInput {
  guildId: string;
  clientReady: boolean;
  clientUserTag: string | null;
  now?: Date;
}

const runCheck = async (
  label: string,
  check: () => Promise<HealthCheckItem>
): Promise<HealthCheckItem> => {
  try {
    return await check();
  } catch (error) {
    return {
      label,
      status: "error",
      message: "Check failed. Review the bot logs and database readiness.",
      error
    };
  }
};

export const aggregateHealthStatus = (
  sections: HealthSection[]
): HealthStatus => {
  const items = sections.flatMap((section) => section.items);

  if (items.some((item) => item.status === "error")) {
    return "error";
  }

  if (items.some((item) => item.status === "warning")) {
    return "warning";
  }

  return "healthy";
};

export const buildBotHealthReport = async (
  store: BotHealthStore,
  input: BotHealthInput
): Promise<BotHealthReport> => {
  const now = input.now ?? new Date();
  const discordItems: HealthCheckItem[] = [
    {
      label: "Client",
      status: input.clientReady ? "healthy" : "error",
      message: input.clientReady
        ? `Client ready${input.clientUserTag ? ` as ${input.clientUserTag}` : ""}.`
        : "Discord client is not ready."
    },
    {
      label: "Guild",
      status: "healthy",
      message: `Running in guild ${input.guildId}.`
    }
  ];

  const databaseItems = await Promise.all([
    runCheck("Connection", async () => {
      await store.$queryRaw`SELECT 1`;

      return {
        label: "Connection",
        status: "healthy",
        message: "Connected."
      };
    }),
    runCheck("Core profile query", async () => {
      await store.userProfile.findFirst({
        where: {
          guildId: input.guildId
        },
        select: {
          id: true
        }
      });

      return {
        label: "Core profile query",
        status: "healthy",
        message: "Core profile table query succeeded."
      };
    }),
    runCheck("Core red envelope query", async () => {
      await store.redEnvelope.count({
        where: {
          guildId: input.guildId
        }
      });

      return {
        label: "Core red envelope query",
        status: "healthy",
        message: "Core red envelope table query succeeded."
      };
    }),
    runCheck("Core lion spawn query", async () => {
      await store.activeLionSpawn.count({
        where: {
          guildId: input.guildId
        }
      });

      return {
        label: "Core lion spawn query",
        status: "healthy",
        message: "Core lion spawn table query succeeded."
      };
    })
  ]);

  const maintenanceItems = await Promise.all([
    runCheck("Maintenance mode", async () => {
      const config = await store.botGuildConfig.findUnique({
        where: {
          guildId: input.guildId
        }
      });

      if (!config) {
        return {
          label: "Maintenance mode",
          status: "warning",
          message: "No guild bot config found; default maintenance behavior applies."
        };
      }

      return {
        label: "Maintenance mode",
        status: config.maintenanceMode ? "warning" : "healthy",
        message: config.maintenanceMode
          ? "Maintenance mode enabled."
          : "Maintenance mode disabled."
      };
    })
  ]);

  const practiceItems = await Promise.all([
    runCheck("Practice schedule", async () => {
      const schedule = await store.practiceSchedule.findUnique({
        where: {
          guildId: input.guildId
        }
      });

      if (!schedule) {
        return {
          label: "Practice schedule",
          status: "warning",
          message: "No practice schedule configured."
        };
      }

      return {
        label: "Practice schedule",
        status: schedule.enabled && schedule.channelId ? "healthy" : "warning",
        message:
          schedule.enabled && schedule.channelId
            ? `Configured for <#${schedule.channelId}> (${schedule.timezone}).`
            : "Practice schedule exists but is disabled or missing a channel."
      };
    }),
    runCheck("Active practice session", async () => {
      const activeSession = await store.practiceSession.findFirst({
        where: {
          guildId: input.guildId,
          status: "ACTIVE"
        },
        orderBy: {
          startedAt: "desc"
        }
      });

      return {
        label: "Active practice session",
        status: "healthy",
        message: activeSession
          ? `Active practice session in <#${activeSession.announcementChannelId}>.`
          : "No active practice session."
      };
    })
  ]);

  const redEnvelopeItems = await Promise.all([
    runCheck("Red envelope config", async () => {
      const config = await store.redEnvelopeDropConfig.findUnique({
        where: {
          guildId: input.guildId
        }
      });

      if (!config) {
        return {
          label: "Red envelope config",
          status: "warning",
          message: "No red envelope drop config found."
        };
      }

      return {
        label: "Red envelope config",
        status: config.enabled ? "healthy" : "warning",
        message: config.enabled
          ? `Configured with fallback <#${config.channelId}>.`
          : "Configured but paused."
      };
    }),
    runCheck("Open red envelopes", async () => {
      const openCount = await store.redEnvelope.count({
        where: {
          guildId: input.guildId,
          status: "OPEN"
        }
      });
      const staleCount = await store.redEnvelope.count({
        where: {
          guildId: input.guildId,
          status: "OPEN",
          createdAt: {
            lte: new Date(
              now.getTime() - RED_ENVELOPE_EXPIRY_MINUTES * 60_000
            )
          }
        }
      });

      return {
        label: "Open red envelopes",
        status: openCount > 0 ? "warning" : "healthy",
        message:
          openCount > 0
            ? `${openCount} open red envelope${openCount === 1 ? "" : "s"} currently recorded${staleCount > 0 ? `, including ${staleCount} stale` : ""}.`
            : "No open red envelopes."
      };
    })
  ]);

  const lionSpawnItems = await Promise.all([
    runCheck("Lion spawn config", async () => {
      const config = await store.lionSpawnConfig.findUnique({
        where: {
          guildId: input.guildId
        }
      });

      if (!config) {
        return {
          label: "Lion spawn config",
          status: "warning",
          message: "No lion spawn config found."
        };
      }

      return {
        label: "Lion spawn config",
        status: config.enabled ? "healthy" : "warning",
        message: config.enabled
          ? "Configured and enabled."
          : "Configured but paused."
      };
    }),
    runCheck("Active lion spawns", async () => {
      const activeCount = await store.activeLionSpawn.count({
        where: {
          guildId: input.guildId,
          status: "ACTIVE",
          expiresAt: {
            gt: now
          }
        }
      });

      return {
        label: "Active lion spawns",
        status: activeCount > 0 ? "warning" : "healthy",
        message:
          activeCount > 0
            ? `${activeCount} active lion spawn${activeCount === 1 ? "" : "s"} currently open.`
            : "No active lion spawns."
      };
    })
  ]);

  const sections = [
    {
      name: "Discord",
      items: discordItems
    },
    {
      name: "Database",
      items: databaseItems
    },
    {
      name: "Maintenance",
      items: maintenanceItems
    },
    {
      name: "Practice",
      items: practiceItems
    },
    {
      name: "Red Envelopes",
      items: redEnvelopeItems
    },
    {
      name: "Lion Spawns",
      items: lionSpawnItems
    }
  ];

  const notes = [
    "Run `/practice configure` if scheduled practice should be active.",
    "Run `/redenvelope configure` if random drops should be active.",
    "Run `/lionadmin configure` if wild spawns should be active.",
    "Run `npm run prisma:migrate:deploy` if database table checks fail."
  ];

  return {
    overallStatus: aggregateHealthStatus(sections),
    sections,
    notes
  };
};

const statusLabel = (status: HealthStatus): string => {
  switch (status) {
    case "healthy":
      return "Healthy";
    case "warning":
      return "Warning";
    case "error":
      return "Error";
  }
};

const itemPrefix = (status: HealthStatus): string => {
  switch (status) {
    case "healthy":
      return "[OK]";
    case "warning":
      return "[WARN]";
    case "error":
      return "[ERROR]";
  }
};

export const formatBotHealthReport = (report: BotHealthReport): string => {
  const lines = [
    "LionDen Health Check",
    "",
    `Overall: ${statusLabel(report.overallStatus)}`
  ];

  for (const section of report.sections) {
    lines.push("", `${section.name}:`);

    for (const item of section.items) {
      lines.push(`${itemPrefix(item.status)} ${item.message}`);
    }
  }

  lines.push("", "Notes:");

  for (const note of report.notes) {
    lines.push(`- ${note}`);
  }

  return lines.join("\n");
};

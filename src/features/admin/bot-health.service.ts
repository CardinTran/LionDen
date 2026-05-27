import type { PrismaClient } from "@prisma/client";

import { RED_ENVELOPE_EXPIRY_MINUTES } from "../economy/red-envelope.service.js";
import { getCurrentHouseRecapWeekKey } from "../houses/house-recap.service.js";
import type { BotGuildConfigRecord } from "./bot-config.service.js";

export type BotHealthStatus = "healthy" | "warning" | "error";

export interface BotHealthCheck {
  label: string;
  status: BotHealthStatus;
  message: string;
  error?: unknown;
}

export interface BotHealthSection {
  name: string;
  checks: BotHealthCheck[];
}

export interface BotHealthReport {
  overallStatus: BotHealthStatus;
  sections: BotHealthSection[];
  notes: string[];
}

type CountDelegate = {
  count(args?: unknown): Promise<number>;
};

export interface BotHealthPrismaClient {
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
    count(args: unknown): Promise<number>;
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
  house: CountDelegate;
  houseRecapConfig: {
    findUnique(args: unknown): Promise<{
      channelId: string | null;
      isEnabled: boolean;
      weekday: number;
      hour: number;
      minute: number;
      timezone: string;
    } | null>;
  };
  houseRecapPost: {
    findUnique(args: unknown): Promise<{
      weekKey: string;
      channelId: string;
      postedAt: Date;
    } | null>;
  };
  houseBadgeDefinition: CountDelegate;
}

export interface GetBotHealthReportInput {
  guildId: string;
  clientReady: boolean;
  clientTag?: string | null;
  now: Date;
}

const runHealthCheck = async (
  label: string,
  check: () => Promise<BotHealthCheck>
): Promise<BotHealthCheck> => {
  try {
    return await check();
  } catch (error) {
    return {
      label,
      status: "error",
      message: "Check failed. Review logs and database readiness.",
      error
    };
  }
};

export const aggregateBotHealthStatus = (
  sections: BotHealthSection[]
): BotHealthStatus => {
  const checks = sections.flatMap((section) => section.checks);

  if (checks.some((check) => check.status === "error")) {
    return "error";
  }

  if (checks.some((check) => check.status === "warning")) {
    return "warning";
  }

  return "healthy";
};

export const getFailedBotHealthChecks = (
  report: BotHealthReport
): Array<{ section: string; check: BotHealthCheck }> => {
  return report.sections.flatMap((section) =>
    section.checks
      .filter((check) => check.status === "error")
      .map((check) => ({
        section: section.name,
        check
      }))
  );
};

export const getBotHealthReport = async (
  prisma: BotHealthPrismaClient | PrismaClient,
  input: GetBotHealthReportInput
): Promise<BotHealthReport> => {
  const discordChecks: BotHealthCheck[] = [
    {
      label: "Client ready",
      status: input.clientReady ? "healthy" : "error",
      message: input.clientReady
        ? `Client ready${input.clientTag ? ` as ${input.clientTag}` : ""}.`
        : "Discord client is not ready."
    },
    {
      label: "Guild context",
      status: "healthy",
      message: `Running in guild ${input.guildId}.`
    }
  ];

  const databaseChecks = await Promise.all([
    runHealthCheck("Database connection", async () => {
      await prisma.$queryRaw`SELECT 1`;

      return {
        label: "Database connection",
        status: "healthy",
        message: "Connected."
      };
    }),
    runHealthCheck("User profiles table", async () => {
      await prisma.userProfile.findFirst({
        where: {
          guildId: input.guildId
        },
        select: {
          id: true
        }
      });

      return {
        label: "User profiles table",
        status: "healthy",
        message: "Core profile query succeeded."
      };
    })
  ]);

  const maintenanceChecks = await Promise.all([
    runHealthCheck("Maintenance mode", async () => {
      const config = await prisma.botGuildConfig.findUnique({
        where: {
          guildId: input.guildId
        }
      });

      if (!config) {
        return {
          label: "Maintenance mode",
          status: "warning",
          message:
            "No guild bot config found; defaults apply until `/botadmin` creates one."
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

  const practiceChecks = await Promise.all([
    runHealthCheck("Practice schedule", async () => {
      const schedule = await prisma.practiceSchedule.findUnique({
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
    runHealthCheck("Active practice session", async () => {
      const session = await prisma.practiceSession.findFirst({
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
        message: session
          ? `Active practice session in <#${session.announcementChannelId}>.`
          : "No active practice session."
      };
    }),
    runHealthCheck("Completed practice sessions", async () => {
      const completedCount = await prisma.practiceSession.count({
        where: {
          guildId: input.guildId,
          status: "ENDED",
          endedAt: {
            lte: input.now
          }
        }
      });

      return {
        label: "Completed practice sessions",
        status: "healthy",
        message: `${completedCount} completed practice session${completedCount === 1 ? "" : "s"} available for attendance history.`
      };
    })
  ]);

  const redEnvelopeChecks = await Promise.all([
    runHealthCheck("Red envelope config", async () => {
      const config = await prisma.redEnvelopeDropConfig.findUnique({
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
    runHealthCheck("Open red envelopes", async () => {
      const staleOpenBefore = new Date(
        input.now.getTime() - RED_ENVELOPE_EXPIRY_MINUTES * 60_000
      );
      const [openCount, staleOpenCount] = await Promise.all([
        prisma.redEnvelope.count({
          where: {
            guildId: input.guildId,
            status: "OPEN"
          }
        }),
        prisma.redEnvelope.count({
          where: {
            guildId: input.guildId,
            status: "OPEN",
            createdAt: {
              lte: staleOpenBefore
            }
          }
        })
      ]);

      return {
        label: "Open red envelopes",
        status: openCount > 0 ? "warning" : "healthy",
        message:
          openCount > 0
            ? `${openCount} open red envelope${openCount === 1 ? "" : "s"} currently recorded${staleOpenCount > 0 ? `, including ${staleOpenCount} stale` : ""}.`
            : "No open red envelopes."
      };
    })
  ]);

  const lionSpawnChecks = await Promise.all([
    runHealthCheck("Lion spawn config", async () => {
      const config = await prisma.lionSpawnConfig.findUnique({
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
    runHealthCheck("Active wild lion spawns", async () => {
      const activeCount = await prisma.activeLionSpawn.count({
        where: {
          guildId: input.guildId,
          status: "ACTIVE",
          expiresAt: {
            gt: input.now
          }
        }
      });

      return {
        label: "Active wild lion spawns",
        status: activeCount > 0 ? "warning" : "healthy",
        message:
          activeCount > 0
            ? `${activeCount} active wild lion spawn${activeCount === 1 ? "" : "s"} currently open.`
            : "No active wild lion spawns."
      };
    })
  ]);

  const houseChecks = await Promise.all([
    runHealthCheck("Active Houses", async () => {
      const activeHouseCount = await prisma.house.count({
        where: {
          guildId: input.guildId,
          isActive: true
        }
      });

      return {
        label: "Active Houses",
        status: activeHouseCount > 0 ? "healthy" : "warning",
        message:
          activeHouseCount > 0
            ? `${activeHouseCount} active House${activeHouseCount === 1 ? "" : "s"} configured.`
            : "No active Houses configured."
      };
    }),
    runHealthCheck("Weekly House Recap", async () => {
      const weekKey = getCurrentHouseRecapWeekKey(input.now);
      const [config, currentPost] = await Promise.all([
        prisma.houseRecapConfig.findUnique({
          where: {
            guildId: input.guildId
          }
        }),
        prisma.houseRecapPost.findUnique({
          where: {
            guildId_weekKey: {
              guildId: input.guildId,
              weekKey
            }
          }
        })
      ]);

      if (!config) {
        return {
          label: "Weekly House Recap",
          status: "warning",
          message: "No Weekly House Recap config found."
        };
      }

      if (config.isEnabled && !config.channelId) {
        return {
          label: "Weekly House Recap",
          status: "warning",
          message: "Weekly House Recap enabled but missing a channel."
        };
      }

      return {
        label: "Weekly House Recap",
        status: config.isEnabled ? "healthy" : "warning",
        message: config.isEnabled
          ? `Enabled for <#${config.channelId}>; current week ${weekKey} ${currentPost ? "already posted" : "not posted yet"}.`
          : "Configured but disabled."
      };
    }),
    runHealthCheck("House badge definitions", async () => {
      const enabledBadgeCount = await prisma.houseBadgeDefinition.count({
        where: {
          isEnabled: true
        }
      });

      return {
        label: "House badge definitions",
        status: enabledBadgeCount > 0 ? "healthy" : "warning",
        message:
          enabledBadgeCount > 0
            ? `${enabledBadgeCount} enabled House badge definition${enabledBadgeCount === 1 ? "" : "s"} synced.`
            : "No enabled House badge definitions found. Run `/houseadmin badge sync`."
      };
    })
  ]);

  const sections: BotHealthSection[] = [
    {
      name: "Discord",
      checks: discordChecks
    },
    {
      name: "Database",
      checks: databaseChecks
    },
    {
      name: "Maintenance",
      checks: maintenanceChecks
    },
    {
      name: "Practice",
      checks: practiceChecks
    },
    {
      name: "Red Envelopes",
      checks: redEnvelopeChecks
    },
    {
      name: "Lion Spawns",
      checks: lionSpawnChecks
    },
    {
      name: "Houses",
      checks: houseChecks
    }
  ];

  return {
    overallStatus: aggregateBotHealthStatus(sections),
    sections,
    notes: [
      "Run `/practice configure` if scheduled practice should be active.",
      "Run `/redenvelope configure` if random drops should be active.",
      "Run `/lionadmin configure` if wild spawns should be active.",
      "Run `/houseadmin create` to configure Team Houses.",
      "Run `/houseadmin recap configure` if Weekly House Recaps should be active.",
      "Run `/houseadmin badge sync` if House badge definitions are missing.",
      "Run `npm run prisma:migrate:deploy` if database table checks fail."
    ]
  };
};

const formatStatusLabel = (status: BotHealthStatus): string => {
  switch (status) {
    case "healthy":
      return "Healthy";
    case "warning":
      return "Warning";
    case "error":
      return "Error";
  }
};

const formatCheckPrefix = (status: BotHealthStatus): string => {
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
    `Overall: ${formatStatusLabel(report.overallStatus)}`
  ];

  for (const section of report.sections) {
    lines.push("", `${section.name}:`);

    for (const check of section.checks) {
      lines.push(`${formatCheckPrefix(check.status)} ${check.message}`);
    }
  }

  lines.push("", "Notes:");

  for (const note of report.notes) {
    lines.push(`- ${note}`);
  }

  return lines.join("\n");
};

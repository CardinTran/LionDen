import { describe, expect, it } from "vitest";

import {
  aggregateBotHealthStatus,
  formatBotHealthReport,
  getBotHealthReport,
  getFailedBotHealthChecks,
  type BotHealthPrismaClient,
  type BotHealthSection
} from "../src/features/admin/bot-health.service.js";

const createHealthyStore = (): BotHealthPrismaClient => ({
  $queryRaw: async <T = unknown>() => [{ ok: 1 }] as T,
  userProfile: {
    findFirst: async () => null
  },
  botGuildConfig: {
    findUnique: async () => ({
      id: "config_123",
      guildId: "guild_123",
      maintenanceMode: false,
      maintenanceMessage: "Maintenance.",
      updatedByUserId: null,
      createdAt: new Date("2026-05-24T12:00:00.000Z"),
      updatedAt: new Date("2026-05-24T12:00:00.000Z")
    })
  },
  practiceSchedule: {
    findUnique: async () => ({
      channelId: "practice_channel",
      enabled: true,
      timezone: "America/Chicago"
    })
  },
  practiceSession: {
    findFirst: async () => null
  },
  redEnvelopeDropConfig: {
    findUnique: async () => ({
      channelId: "red_channel",
      enabled: true,
      nextDropAt: new Date("2026-05-24T13:00:00.000Z")
    })
  },
  redEnvelope: {
    count: async () => 0
  },
  lionSpawnConfig: {
    findUnique: async () => ({
      enabled: true,
      nextSpawnAt: new Date("2026-05-24T14:00:00.000Z")
    })
  },
  activeLionSpawn: {
    count: async () => 0
  },
  house: {
    count: async () => 1
  }
});

describe("bot health service", () => {
  it("aggregates overall health by highest-severity check", () => {
    const sections: BotHealthSection[] = [
      {
        name: "First",
        checks: [
          {
            label: "healthy",
            status: "healthy",
            message: "ok"
          }
        ]
      },
      {
        name: "Second",
        checks: [
          {
            label: "warning",
            status: "warning",
            message: "warn"
          }
        ]
      }
    ];

    expect(aggregateBotHealthStatus(sections)).toBe("warning");

    sections[1]?.checks.push({
      label: "error",
      status: "error",
      message: "error"
    });

    expect(aggregateBotHealthStatus(sections)).toBe("error");
  });

  it("formats a healthy report with the expected subsystem sections", async () => {
    const report = await getBotHealthReport(createHealthyStore(), {
      guildId: "guild_123",
      clientReady: true,
      clientTag: "LionDen#0000",
      now: new Date("2026-05-24T12:00:00.000Z")
    });
    const output = formatBotHealthReport(report);

    expect(report.overallStatus).toBe("healthy");
    expect(output).toContain("Overall: Healthy");
    expect(output).toContain("Discord:");
    expect(output).toContain("Database:");
    expect(output).toContain("Practice:");
    expect(output).toContain("Red Envelopes:");
    expect(output).toContain("Lion Spawns:");
    expect(output).toContain("Houses:");
  });

  it("returns partial report results when one check fails", async () => {
    const store = createHealthyStore();
    const failure = new Error("missing table");

    store.userProfile.findFirst = async () => {
      throw failure;
    };

    const report = await getBotHealthReport(store, {
      guildId: "guild_123",
      clientReady: true,
      clientTag: "LionDen#0000",
      now: new Date("2026-05-24T12:00:00.000Z")
    });
    const output = formatBotHealthReport(report);

    expect(report.overallStatus).toBe("error");
    expect(getFailedBotHealthChecks(report)).toEqual([
      {
        section: "Database",
        check: expect.objectContaining({
          label: "User profiles table",
          status: "error",
          error: failure
        })
      }
    ]);
    expect(output).toContain("[ERROR] Check failed.");
    expect(output).toContain("Maintenance:");
    expect(output).toContain("Lion Spawns:");
  });

  it("warns for missing optional scheduler configuration", async () => {
    const store = createHealthyStore();

    store.practiceSchedule.findUnique = async () => null;
    store.redEnvelopeDropConfig.findUnique = async () => null;
    store.lionSpawnConfig.findUnique = async () => null;

    const report = await getBotHealthReport(store, {
      guildId: "guild_123",
      clientReady: true,
      now: new Date("2026-05-24T12:00:00.000Z")
    });
    const output = formatBotHealthReport(report);

    expect(report.overallStatus).toBe("warning");
    expect(output).toContain("No practice schedule configured.");
    expect(output).toContain("No red envelope drop config found.");
    expect(output).toContain("No lion spawn config found.");
  });
});

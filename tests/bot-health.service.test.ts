import { describe, expect, it } from "vitest";

import {
  aggregateHealthStatus,
  buildBotHealthReport,
  formatBotHealthReport,
  type HealthSection
} from "../src/features/admin/bot-health.service.js";

const createHealthyStore = () => ({
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
  }
});

describe("bot health service", () => {
  it("aggregates overall health by highest-severity check", () => {
    const sections: HealthSection[] = [
      {
        name: "A",
        items: [
          {
            label: "one",
            status: "healthy",
            message: "ok"
          }
        ]
      },
      {
        name: "B",
        items: [
          {
            label: "two",
            status: "warning",
            message: "warn"
          }
        ]
      }
    ];

    expect(aggregateHealthStatus(sections)).toBe("warning");

    sections[1]?.items.push({
      label: "three",
      status: "error",
      message: "error"
    });

    expect(aggregateHealthStatus(sections)).toBe("error");
  });

  it("formats a healthy checklist with core subsystem sections", async () => {
    const report = await buildBotHealthReport(createHealthyStore(), {
      guildId: "guild_123",
      clientReady: true,
      clientUserTag: "LionDen#0000",
      now: new Date("2026-05-24T12:00:00.000Z")
    });

    expect(report.overallStatus).toBe("healthy");
    expect(formatBotHealthReport(report)).toContain("Overall: Healthy");
    expect(formatBotHealthReport(report)).toContain("Database:");
    expect(formatBotHealthReport(report)).toContain(
      "Core profile table query succeeded."
    );
    expect(formatBotHealthReport(report)).toContain("Red Envelopes:");
    expect(formatBotHealthReport(report)).toContain("Lion Spawns:");
  });

  it("returns partial results when a database check fails", async () => {
    const store = createHealthyStore();
    const databaseError = new Error("missing table");
    store.userProfile.findFirst = async () => {
      throw databaseError;
    };

    const report = await buildBotHealthReport(store, {
      guildId: "guild_123",
      clientReady: true,
      clientUserTag: "LionDen#0000",
      now: new Date("2026-05-24T12:00:00.000Z")
    });
    const output = formatBotHealthReport(report);

    expect(report.overallStatus).toBe("error");
    expect(output).toContain("Overall: Error");
    expect(output).toContain("[ERROR] Check failed.");
    expect(output).toContain("Maintenance:");
    expect(output).toContain("Practice:");
  });
});

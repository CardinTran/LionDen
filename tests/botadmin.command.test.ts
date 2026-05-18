import { describe, expect, it } from "vitest";

import {
  botAdminCommandJson,
  formatBotAdminStatusMessage
} from "../src/bot/commands/botadmin.js";

describe("botadmin command", () => {
  it("exports officer-only maintenance controls", () => {
    expect(botAdminCommandJson.name).toBe("botadmin");
    expect(botAdminCommandJson.options?.map((option) => option.name)).toEqual([
      "status",
      "health",
      "reloadpresence",
      "maintenance"
    ]);
  });

  it("formats maintenance status without exposing public controls", () => {
    expect(
      formatBotAdminStatusMessage({
        id: "config_123",
        guildId: "guild_123",
        maintenanceMode: true,
        maintenanceMessage: "Maintenance window.",
        updatedByUserId: "officer_123",
        createdAt: new Date("2026-05-16T12:00:00.000Z"),
        updatedAt: new Date("2026-05-16T12:00:00.000Z")
      })
    ).toBe(
      [
        "LionDen bot admin status",
        "Maintenance mode: enabled",
        "Maintenance message: Maintenance window."
      ].join("\n")
    );
  });
});

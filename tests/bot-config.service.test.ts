import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_MAINTENANCE_MESSAGE,
  normalizeMaintenanceMessage,
  setMaintenanceMode
} from "../src/features/admin/bot-config.service.js";

describe("bot config service", () => {
  it("normalizes empty maintenance messages to the default", () => {
    expect(normalizeMaintenanceMessage("   ")).toBe(
      DEFAULT_MAINTENANCE_MESSAGE
    );
  });

  it("stores maintenance mode changes per guild", async () => {
    const upsert = vi.fn().mockResolvedValue({
      id: "config_123",
      guildId: "guild_123",
      maintenanceMode: true,
      maintenanceMessage: "Upgrading LionDen.",
      updatedByUserId: "officer_123",
      createdAt: new Date("2026-05-16T12:00:00.000Z"),
      updatedAt: new Date("2026-05-16T12:00:00.000Z")
    });

    const result = await setMaintenanceMode(
      {
        botGuildConfig: {
          upsert,
          findUnique: vi.fn()
        }
      },
      {
        guildId: "guild_123",
        enabled: true,
        message: "Upgrading LionDen.",
        updatedByUserId: "officer_123"
      }
    );

    expect(result.maintenanceMode).toBe(true);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          guildId: "guild_123"
        },
        update: expect.objectContaining({
          maintenanceMode: true,
          updatedByUserId: "officer_123"
        })
      })
    );
  });
});

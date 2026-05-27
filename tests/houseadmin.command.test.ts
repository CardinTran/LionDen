import { PermissionFlagsBits } from "discord.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAddHousePoints = vi.fn();
const mockAssignUserToHouse = vi.fn();
const mockCreateHouse = vi.fn();
const mockDeactivateHouse = vi.fn();
const mockGetHouseByKey = vi.fn();
const mockRemoveHousePoints = vi.fn();
const mockRemoveUserFromHouse = vi.fn();
const mockRenameHouse = vi.fn();
const mockConfigureHouseRecap = vi.fn();
const mockDisableHouseRecap = vi.fn();
const mockGetHouseRecapConfig = vi.fn();
const mockGetHouseRecapStatus = vi.fn();
const mockFetchHouseRecapChannel = vi.fn();
const mockPostWeeklyHouseRecapNow = vi.fn();
const mockAwardHouseBadge = vi.fn();
const mockSyncDefaultHouseBadgeDefinitions = vi.fn();

vi.mock("../src/features/houses/house.service.js", async () => {
  const actual = await vi.importActual<
    typeof import("../src/features/houses/house.service.js")
  >("../src/features/houses/house.service.js");

  return {
    ...actual,
    addHousePoints: mockAddHousePoints,
    assignUserToHouse: mockAssignUserToHouse,
    createHouse: mockCreateHouse,
    deactivateHouse: mockDeactivateHouse,
    getHouseByKey: mockGetHouseByKey,
    removeHousePoints: mockRemoveHousePoints,
    removeUserFromHouse: mockRemoveUserFromHouse,
    renameHouse: mockRenameHouse
  };
});

vi.mock("../src/lib/prisma.js", () => ({
  prisma: {}
}));

vi.mock("../src/features/houses/house-recap.service.js", async () => {
  const actual = await vi.importActual<
    typeof import("../src/features/houses/house-recap.service.js")
  >("../src/features/houses/house-recap.service.js");

  return {
    ...actual,
    configureHouseRecap: mockConfigureHouseRecap,
    disableHouseRecap: mockDisableHouseRecap,
    getHouseRecapConfig: mockGetHouseRecapConfig,
    getHouseRecapStatus: mockGetHouseRecapStatus
  };
});

vi.mock("../src/features/houses/house-recap-scheduler.js", () => ({
  fetchHouseRecapChannel: mockFetchHouseRecapChannel,
  postWeeklyHouseRecapNow: mockPostWeeklyHouseRecapNow
}));

vi.mock("../src/features/houses/house-achievement.service.js", async () => {
  const actual = await vi.importActual<
    typeof import("../src/features/houses/house-achievement.service.js")
  >("../src/features/houses/house-achievement.service.js");

  return {
    ...actual,
    awardHouseBadge: mockAwardHouseBadge,
    syncDefaultHouseBadgeDefinitions: mockSyncDefaultHouseBadgeDefinitions
  };
});

vi.mock("../src/lib/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

const { houseAdminCommand, houseAdminCommandJson } =
  await import("../src/bot/commands/houseadmin.js");

const buildHouse = () => ({
  id: "house_123",
  guildId: "guild_123",
  houseKey: "red-house",
  name: "Red House",
  description: null,
  emoji: null,
  color: null,
  isActive: true,
  createdAt: new Date("2026-05-26T12:00:00.000Z"),
  updatedAt: new Date("2026-05-26T12:00:00.000Z")
});

const buildMembershipResult = () => {
  const house = buildHouse();

  return {
    outcome: "assigned",
    membership: {
      id: "membership_123",
      guildId: "guild_123",
      houseId: house.id,
      userId: "user_456",
      joinedAt: house.createdAt,
      updatedAt: house.updatedAt
    },
    house,
    previousHouse: null
  };
};

const createInteraction = (
  subcommand:
    | "create"
    | "assign"
    | "remove"
    | "rename"
    | "deactivate"
    | "add"
    | "removePoints"
    | "recapConfigure"
    | "recapStatus"
    | "recapPostNow"
    | "recapDisable"
    | "badgeSync"
    | "badgeGrant",
  subcommandGroup: string | null = null
) => {
  const member = {
    id: "user_456",
    username: "Cardin"
  };

  return {
    guildId: "guild_123",
    user: {
      id: "admin_123",
      username: "OfficerA"
    },
    memberPermissions: {
      has: vi.fn(
        (permission: bigint) => permission === PermissionFlagsBits.ManageGuild
      )
    },
    client: {
      channels: {
        fetch: vi.fn()
      }
    },
    options: {
      getSubcommandGroup: vi.fn(() => subcommandGroup),
      getSubcommand: vi.fn(() => {
        if (subcommand === "removePoints") {
          return "remove";
        }

        if (subcommand.startsWith("recap")) {
          return subcommand.replace("recap", "").toLowerCase();
        }

        if (subcommand.startsWith("badge")) {
          return subcommand.replace("badge", "").toLowerCase();
        }

        return subcommand;
      }),
      getString: vi.fn((name: string) => {
        const values: Record<string, string> = {
          key: "red-house",
          name: "Red House",
          house: "red-house",
          badge: "house-founder",
          reason: "Manual correction"
        };
        return values[name] ?? null;
      }),
      getUser: vi.fn((name: string) => (name === "member" ? member : null)),
      getInteger: vi.fn((name: string) => {
        const values: Record<string, number> = {
          amount: 10,
          weekday: 0,
          hour: 18,
          minute: 0
        };
        return values[name] ?? null;
      }),
      getChannel: vi.fn((name: string) =>
        name === "channel"
          ? {
              id: "recap_channel",
              send: vi.fn()
            }
          : null
      ),
      getBoolean: vi.fn(() => false)
    },
    reply: vi.fn()
  };
};

describe("houseadmin command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const house = buildHouse();

    mockCreateHouse.mockResolvedValue({
      outcome: "created",
      house
    });
    mockAssignUserToHouse.mockResolvedValue(buildMembershipResult());
    mockRemoveUserFromHouse.mockResolvedValue({
      ...buildMembershipResult(),
      outcome: "removed"
    });
    mockRenameHouse.mockResolvedValue({
      outcome: "updated",
      house
    });
    mockDeactivateHouse.mockResolvedValue({
      outcome: "updated",
      house: {
        ...house,
        isActive: false
      }
    });
    mockGetHouseByKey.mockResolvedValue(house);
    mockAddHousePoints.mockResolvedValue({
      outcome: "recorded",
      ledger: {
        id: "ledger_123",
        guildId: "guild_123",
        houseId: house.id,
        userId: null,
        sourceType: "ADMIN_ADJUSTMENT",
        sourceId: null,
        points: 10,
        reason: "Manual correction",
        createdAt: house.createdAt
      },
      house
    });
    mockRemoveHousePoints.mockResolvedValue({
      outcome: "recorded",
      ledger: {
        id: "ledger_124",
        guildId: "guild_123",
        houseId: house.id,
        userId: null,
        sourceType: "ADMIN_ADJUSTMENT",
        sourceId: null,
        points: -10,
        reason: "Manual correction",
        createdAt: house.createdAt
      },
      house
    });
    const recapConfig = {
      id: "recap_config_123",
      guildId: "guild_123",
      channelId: "recap_channel",
      isEnabled: true,
      weekday: 0,
      hour: 18,
      minute: 0,
      timezone: "America/Chicago",
      createdAt: house.createdAt,
      updatedAt: house.updatedAt
    };
    mockConfigureHouseRecap.mockResolvedValue(recapConfig);
    mockDisableHouseRecap.mockResolvedValue({
      ...recapConfig,
      isEnabled: false,
      updatedAt: house.updatedAt
    });
    mockGetHouseRecapConfig.mockResolvedValue(recapConfig);
    mockGetHouseRecapStatus.mockResolvedValue({
      config: recapConfig,
      weekKey: "2026-W22",
      alreadyPosted: false,
      currentWeekPost: null,
      lastPost: null
    });
    mockPostWeeklyHouseRecapNow.mockResolvedValue({
      outcome: "posted",
      weekKey: "2026-W22",
      messageId: "message_123",
      post: null,
      alreadyPosted: null
    });
    mockSyncDefaultHouseBadgeDefinitions.mockResolvedValue([
      {
        id: "definition_123",
        badgeKey: "house-founder",
        title: "House Founder",
        description: "Foundation period.",
        category: "MEMBERSHIP",
        isEnabled: true,
        createdAt: house.createdAt,
        updatedAt: house.updatedAt
      }
    ]);
    mockAwardHouseBadge.mockResolvedValue({
      outcome: "awarded",
      award: {
        id: "award_123",
        guildId: "guild_123",
        userId: "user_456",
        badgeKey: "house-founder",
        houseId: "house_123",
        weekKey: null,
        awardedAt: house.createdAt,
        reason: "Manual correction"
      },
      definition: {
        id: "definition_123",
        badgeKey: "house-founder",
        title: "House Founder",
        description: "Foundation period.",
        category: "MEMBERSHIP",
        isEnabled: true,
        createdAt: house.createdAt,
        updatedAt: house.updatedAt
      }
    });
    mockFetchHouseRecapChannel.mockResolvedValue({
      id: "recap_channel",
      send: vi.fn()
    });
  });

  it("exports the expected slash command metadata", () => {
    expect(houseAdminCommandJson.name).toBe("houseadmin");
    expect(houseAdminCommandJson.default_member_permissions).toBe(
      String(PermissionFlagsBits.ManageGuild)
    );
    expect(houseAdminCommandJson.options?.map((option) => option.name)).toEqual(
      [
        "create",
        "assign",
        "remove",
        "rename",
        "deactivate",
        "points",
        "recap",
        "badge"
      ]
    );
  });

  it("creates a House", async () => {
    const interaction = createInteraction("create");

    await houseAdminCommand.execute(interaction as never);

    expect(mockCreateHouse).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        guildId: "guild_123",
        houseKey: "red-house",
        name: "Red House",
        createdByUserId: "admin_123"
      })
    );
    expect(interaction.reply).toHaveBeenCalledWith({
      content: "Created Red House `red-house`.",
      ephemeral: true
    });
  });

  it("assigns and removes members", async () => {
    const assignInteraction = createInteraction("assign");
    const removeInteraction = createInteraction("remove");

    await houseAdminCommand.execute(assignInteraction as never);
    await houseAdminCommand.execute(removeInteraction as never);

    expect(mockAssignUserToHouse).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        userId: "user_456",
        houseKey: "red-house"
      }
    );
    expect(assignInteraction.reply).toHaveBeenCalledWith({
      content: "Cardin assigned to Red House `red-house`.",
      ephemeral: true
    });
    expect(removeInteraction.reply).toHaveBeenCalledWith({
      content: "Cardin was removed from Red House `red-house`.",
      ephemeral: true
    });
  });

  it("renames and deactivates Houses", async () => {
    const renameInteraction = createInteraction("rename");
    const deactivateInteraction = createInteraction("deactivate");

    await houseAdminCommand.execute(renameInteraction as never);
    await houseAdminCommand.execute(deactivateInteraction as never);

    expect(mockRenameHouse).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        houseKey: "red-house",
        name: "Red House"
      })
    );
    expect(renameInteraction.reply).toHaveBeenCalledWith({
      content: "Updated Red House `red-house`.",
      ephemeral: true
    });
    expect(deactivateInteraction.reply).toHaveBeenCalledWith({
      content: "Red House `red-house` is now inactive.",
      ephemeral: true
    });
  });

  it("adds and removes House points through the ledger", async () => {
    const addInteraction = createInteraction("add", "points");
    const removeInteraction = createInteraction("removePoints", "points");

    await houseAdminCommand.execute(addInteraction as never);
    await houseAdminCommand.execute(removeInteraction as never);

    expect(mockAddHousePoints).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        guildId: "guild_123",
        houseId: "house_123",
        sourceType: "ADMIN_ADJUSTMENT",
        points: 10,
        reason: "Manual correction",
        adminUserId: "admin_123"
      })
    );
    expect(mockRemoveHousePoints).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        guildId: "guild_123",
        houseId: "house_123",
        points: 10,
        reason: "Manual correction",
        adminUserId: "admin_123"
      })
    );
    expect(addInteraction.reply).toHaveBeenCalledWith({
      content: "Added 10 House points for Red House `red-house`.",
      ephemeral: true
    });
    expect(removeInteraction.reply).toHaveBeenCalledWith({
      content: "Removed 10 House points for Red House `red-house`.",
      ephemeral: true
    });
  });

  it("configures Weekly House Recaps", async () => {
    const interaction = createInteraction("recapConfigure", "recap");

    await houseAdminCommand.execute(interaction as never);

    expect(mockConfigureHouseRecap).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        channelId: "recap_channel",
        weekday: 0,
        hour: 18,
        minute: 0,
        timezone: null
      }
    );
    expect(interaction.reply).toHaveBeenCalledWith({
      content: expect.stringContaining("Weekly House Recap enabled"),
      ephemeral: true
    });
  });

  it("shows Weekly House Recap status", async () => {
    const interaction = createInteraction("recapStatus", "recap");

    await houseAdminCommand.execute(interaction as never);

    expect(mockGetHouseRecapStatus).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        guildId: "guild_123"
      })
    );
    expect(interaction.reply).toHaveBeenCalledWith({
      content: expect.stringContaining("Weekly House Recap Status"),
      ephemeral: true
    });
  });

  it("posts Weekly House Recaps now", async () => {
    const interaction = createInteraction("recapPostNow", "recap");

    await houseAdminCommand.execute(interaction as never);

    expect(mockPostWeeklyHouseRecapNow).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        guildId: "guild_123",
        channel: expect.objectContaining({
          id: "recap_channel"
        }),
        force: false
      })
    );
    expect(interaction.reply).toHaveBeenCalledWith({
      content: "Posted Weekly House Recap for 2026-W22 to <#recap_channel>.",
      ephemeral: true
    });
  });

  it("disables Weekly House Recaps", async () => {
    const interaction = createInteraction("recapDisable", "recap");

    await houseAdminCommand.execute(interaction as never);

    expect(mockDisableHouseRecap).toHaveBeenCalledWith({}, "guild_123");
    expect(interaction.reply).toHaveBeenCalledWith({
      content:
        "Weekly House Recap disabled. Existing config and post history were kept.",
      ephemeral: true
    });
  });

  it("syncs and grants House badges", async () => {
    const syncInteraction = createInteraction("badgeSync", "badge");
    const grantInteraction = createInteraction("badgeGrant", "badge");

    await houseAdminCommand.execute(syncInteraction as never);
    await houseAdminCommand.execute(grantInteraction as never);

    expect(mockSyncDefaultHouseBadgeDefinitions).toHaveBeenCalledWith({});
    expect(mockGetHouseByKey).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        houseKey: "red-house"
      }
    );
    expect(mockAwardHouseBadge).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        guildId: "guild_123",
        userId: "user_456",
        badgeKey: "house-founder",
        houseId: "house_123",
        reason: "Manual correction"
      })
    );
    expect(syncInteraction.reply).toHaveBeenCalledWith({
      content: "Synced 1 default House badge definition.",
      ephemeral: true
    });
    expect(grantInteraction.reply).toHaveBeenCalledWith({
      content: "Granted House Founder to Cardin.",
      ephemeral: true
    });
  });

  it("requires Manage Guild permission at runtime", async () => {
    const interaction = createInteraction("create");
    interaction.memberPermissions.has.mockReturnValue(false);

    await houseAdminCommand.execute(interaction as never);

    expect(mockCreateHouse).not.toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalledWith({
      content: "You do not have permission to manage LionDen Houses.",
      ephemeral: true
    });
  });
});

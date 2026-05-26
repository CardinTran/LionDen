import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetHouseProfile = vi.fn();
const mockJoinHouse = vi.fn();
const mockLeaveHouse = vi.fn();
const mockListHouseLeaderboard = vi.fn();
const mockListHouseRoster = vi.fn();

vi.mock("../src/features/houses/house.service.js", async () => {
  const actual = await vi.importActual<
    typeof import("../src/features/houses/house.service.js")
  >("../src/features/houses/house.service.js");

  return {
    ...actual,
    getHouseProfile: mockGetHouseProfile,
    joinHouse: mockJoinHouse,
    leaveHouse: mockLeaveHouse,
    listHouseLeaderboard: mockListHouseLeaderboard,
    listHouseRoster: mockListHouseRoster
  };
});

vi.mock("../src/lib/prisma.js", () => ({
  prisma: {}
}));

const { houseCommand, houseCommandJson } =
  await import("../src/bot/commands/house.js");

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

const createInteraction = (
  subcommand: "join" | "leave" | "profile" | "leaderboard" | "roster"
) => {
  const user = {
    id: "user_123",
    username: "Mira"
  };

  return {
    guildId: "guild_123",
    user,
    member: {
      displayName: "Mira"
    },
    options: {
      getSubcommand: vi.fn(() => subcommand),
      getString: vi.fn((name: string) =>
        name === "house" ? "red-house" : null
      ),
      getUser: vi.fn(() => null)
    },
    reply: vi.fn()
  };
};

describe("house command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const house = buildHouse();

    mockJoinHouse.mockResolvedValue({
      outcome: "joined",
      membership: {
        id: "membership_123",
        guildId: "guild_123",
        houseId: house.id,
        userId: "user_123",
        joinedAt: house.createdAt,
        updatedAt: house.updatedAt
      },
      house,
      previousHouse: null
    });
    mockLeaveHouse.mockResolvedValue({
      outcome: "left",
      membership: null,
      house,
      previousHouse: house
    });
    mockGetHouseProfile.mockResolvedValue({
      membership: {
        id: "membership_123",
        guildId: "guild_123",
        houseId: house.id,
        userId: "user_123",
        joinedAt: house.createdAt,
        updatedAt: house.updatedAt
      },
      house,
      weekPoints: 10,
      lifetimePoints: 25
    });
    mockListHouseLeaderboard.mockResolvedValue([
      {
        house,
        points: 25
      }
    ]);
    mockListHouseRoster.mockResolvedValue({
      house,
      memberships: [
        {
          id: "membership_123",
          guildId: "guild_123",
          houseId: house.id,
          userId: "user_123",
          joinedAt: house.createdAt,
          updatedAt: house.updatedAt
        }
      ]
    });
  });

  it("exports the expected slash command metadata", () => {
    expect(houseCommandJson.name).toBe("house");
    expect(houseCommandJson.options?.map((option) => option.name)).toEqual([
      "join",
      "leave",
      "profile",
      "leaderboard",
      "roster"
    ]);
  });

  it("joins a House ephemerally", async () => {
    const interaction = createInteraction("join");

    await houseCommand.execute(interaction as never);

    expect(mockJoinHouse).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        userId: "user_123",
        houseKey: "red-house"
      }
    );
    expect(interaction.reply).toHaveBeenCalledWith({
      content: "You joined Red House `red-house`.",
      ephemeral: true
    });
  });

  it("leaves a House ephemerally", async () => {
    const interaction = createInteraction("leave");

    await houseCommand.execute(interaction as never);

    expect(mockLeaveHouse).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        userId: "user_123"
      }
    );
    expect(interaction.reply).toHaveBeenCalledWith({
      content: "You left Red House `red-house`.",
      ephemeral: true
    });
  });

  it("shows a House profile with membership", async () => {
    const interaction = createInteraction("profile");

    await houseCommand.execute(interaction as never);

    expect(mockGetHouseProfile).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        userId: "user_123",
        now: expect.any(Date)
      }
    );
    expect(interaction.reply).toHaveBeenCalledWith({
      content: expect.stringContaining("Mira's House profile"),
      ephemeral: true
    });
  });

  it("handles a House profile with no membership", async () => {
    mockGetHouseProfile.mockResolvedValue({
      membership: null,
      house: null,
      weekPoints: 0,
      lifetimePoints: 0
    });
    const interaction = createInteraction("profile");

    await houseCommand.execute(interaction as never);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: "Mira is not in a House yet.",
      ephemeral: true
    });
  });

  it("shows leaderboard and roster output", async () => {
    const leaderboardInteraction = createInteraction("leaderboard");
    const rosterInteraction = createInteraction("roster");

    await houseCommand.execute(leaderboardInteraction as never);
    await houseCommand.execute(rosterInteraction as never);

    expect(leaderboardInteraction.reply).toHaveBeenCalledWith({
      content: "House Cup standings\n1. Red House `red-house` - 25 points",
      ephemeral: true
    });
    expect(rosterInteraction.reply).toHaveBeenCalledWith({
      content: "Red House `red-house` roster\n- <@user_123>",
      ephemeral: true
    });
  });

  it("handles no leaderboard data and empty roster", async () => {
    mockListHouseLeaderboard.mockResolvedValue([]);
    mockListHouseRoster.mockResolvedValue({
      house: buildHouse(),
      memberships: []
    });
    const leaderboardInteraction = createInteraction("leaderboard");
    const rosterInteraction = createInteraction("roster");

    await houseCommand.execute(leaderboardInteraction as never);
    await houseCommand.execute(rosterInteraction as never);

    expect(leaderboardInteraction.reply).toHaveBeenCalledWith({
      content: "No active Houses are configured yet.",
      ephemeral: true
    });
    expect(rosterInteraction.reply).toHaveBeenCalledWith({
      content: "Red House `red-house` has no members yet.",
      ephemeral: true
    });
  });
});

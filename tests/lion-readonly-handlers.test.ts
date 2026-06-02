import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Message } from "discord.js";

import type { LionMessageCommandContext } from "../src/bot/messages/lions/types.js";

const mockFindLionSpeciesByQuery = vi.fn();
const mockFindUserLionFromList = vi.fn();
const mockGetLionTrainerBattleStats = vi.fn();
const mockListActiveWildLionSpawns = vi.fn();
const mockListRecentLionBattles = vi.fn();
const mockListRecentNotableLionCatches = vi.fn();
const mockListTopLionBattleTrainers = vi.fn();
const mockListTopOwnedLions = vi.fn();
const mockListUserLions = vi.fn();
const mockListUserLionTeam = vi.fn();
const mockGetFavoriteLion = vi.fn();

const mockFormatLionBattleBoardMessage = vi.fn();
const mockFormatLionBattleHistoryMessage = vi.fn();
const mockFormatLionTrainerBattleStatsMessage = vi.fn();
const mockFormatLionSpeciesMessage = vi.fn();
const mockFormatOwnedLionMessage = vi.fn();
const mockFormatRecentNotableLionCatchesMessage = vi.fn();
const mockFormatTopLionsMessage = vi.fn();
const mockFormatUserLionsMessage = vi.fn();
const mockFormatWildLionStatusMessage = vi.fn();
const mockBuildLionImageReply = vi.fn((content: string) => content);

vi.mock("../src/lib/prisma.js", () => ({
  prisma: {}
}));

vi.mock("../src/features/lions/lion-creature.service.js", () => ({
  findLionSpeciesByQuery: mockFindLionSpeciesByQuery,
  findUserLionFromList: mockFindUserLionFromList,
  getLionTrainerBattleStats: mockGetLionTrainerBattleStats,
  listActiveWildLionSpawns: mockListActiveWildLionSpawns,
  listRecentLionBattles: mockListRecentLionBattles,
  listRecentNotableLionCatches: mockListRecentNotableLionCatches,
  listTopLionBattleTrainers: mockListTopLionBattleTrainers,
  listTopOwnedLions: mockListTopOwnedLions,
  listUserLions: mockListUserLions,
  listUserLionTeam: mockListUserLionTeam
}));

vi.mock("../src/features/lions/lion-showcase.service.js", () => ({
  getFavoriteLion: mockGetFavoriteLion
}));

vi.mock("../src/features/lions/lion-formatting.js", () => ({
  formatLionBattleBoardMessage: mockFormatLionBattleBoardMessage,
  formatLionBattleHistoryMessage: mockFormatLionBattleHistoryMessage,
  formatLionTrainerBattleStatsMessage: mockFormatLionTrainerBattleStatsMessage,
  formatLionSpeciesMessage: mockFormatLionSpeciesMessage,
  formatOwnedLionMessage: mockFormatOwnedLionMessage,
  formatRecentNotableLionCatchesMessage:
    mockFormatRecentNotableLionCatchesMessage,
  formatTopLionsMessage: mockFormatTopLionsMessage,
  formatUserLionsMessage: mockFormatUserLionsMessage,
  formatWildLionStatusMessage: mockFormatWildLionStatusMessage
}));

vi.mock("../src/bot/messages/lions/image-reply.js", () => ({
  buildLionImageReply: mockBuildLionImageReply
}));

const { handleBattleHistoryLionMessage } =
  await import("../src/bot/messages/lions/battle-history.handler.js");
const { handleLeaderboardsLionMessage } =
  await import("../src/bot/messages/lions/leaderboards.handler.js");
const { handleRosterLionMessage } =
  await import("../src/bot/messages/lions/roster.handler.js");
const { handleWildLionMessage } =
  await import("../src/bot/messages/lions/wild.handler.js");

const createdAt = new Date("2026-05-25T12:00:00.000Z");

const createMention = (
  input: {
    userId?: string;
    username?: string;
    displayName?: string;
  } = {}
) => {
  const user = input.userId
    ? {
        id: input.userId,
        username: input.username ?? "Kai"
      }
    : undefined;
  const member =
    user && input.displayName
      ? {
          displayName: input.displayName
        }
      : undefined;

  return {
    user,
    member
  };
};

const createMessage = (
  mention: ReturnType<typeof createMention> = createMention()
): Message =>
  ({
    guildId: "guild_123",
    channelId: "channel_123",
    createdAt,
    author: {
      id: "user_123",
      username: "Mira"
    },
    member: {
      displayName: "Mira Lee"
    },
    mentions: {
      users: {
        first: () => mention.user
      },
      members: {
        first: () => mention.member
      }
    },
    reply: vi.fn()
  }) as unknown as Message;

const createContext = (
  input: Pick<LionMessageCommandContext, "normalizedCommand" | "args"> & {
    mention?: ReturnType<typeof createMention>;
  }
): LionMessageCommandContext => ({
  message: createMessage(input.mention),
  guildId: "guild_123",
  normalizedCommand: input.normalizedCommand,
  args: input.args
});

const ownedLion = {
  id: "lion_123",
  species: {
    imagePath: "assets/lions/cards/rdl-lion-001.jpg",
    name: "Lion One",
    publicId: "L001"
  }
};

const species = {
  id: "species_006",
  name: "RDL Lion 006",
  publicId: "L006",
  slug: "rdl-lion-006",
  imagePath: "assets/lions/cards/rdl-lion-006.jpg"
};

describe("read-only lion message handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFormatLionBattleBoardMessage.mockReturnValue("battle board");
    mockFormatLionBattleHistoryMessage.mockReturnValue("battle history");
    mockFormatLionTrainerBattleStatsMessage.mockReturnValue("battle stats");
    mockFormatLionSpeciesMessage.mockReturnValue("species lion");
    mockFormatOwnedLionMessage.mockReturnValue("owned lion");
    mockFormatRecentNotableLionCatchesMessage.mockReturnValue("rare catches");
    mockFormatTopLionsMessage.mockReturnValue("top lions");
    mockFormatUserLionsMessage.mockReturnValue("user lions");
    mockFormatWildLionStatusMessage.mockReturnValue("wild lions");
    mockFindLionSpeciesByQuery.mockResolvedValue(null);
    mockGetFavoriteLion.mockResolvedValue(null);
  });

  it("routes ~lions through roster and team lookups", async () => {
    const lions = [ownedLion];
    const team = [
      {
        slot: 1,
        lion: ownedLion
      }
    ];
    const context = createContext({
      normalizedCommand: "~lions",
      args: []
    });
    mockListUserLions.mockResolvedValue(lions);
    mockListUserLionTeam.mockResolvedValue(team);

    await expect(handleRosterLionMessage(context)).resolves.toBe(true);

    expect(mockListUserLions).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        userId: "user_123",
        limit: 20
      }
    );
    expect(mockListUserLionTeam).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        userId: "user_123"
      }
    );
    expect(mockFormatUserLionsMessage).toHaveBeenCalledWith({
      lions,
      displayName: "Mira Lee",
      team,
      favoriteLionId: null
    });
    expect(mockFindLionSpeciesByQuery).not.toHaveBeenCalled();
    expect(context.message.reply).toHaveBeenCalledWith("user lions");
  });

  it("keeps ~lion usage guidance when no query is provided", async () => {
    const context = createContext({
      normalizedCommand: "~lion",
      args: []
    });

    await expect(handleRosterLionMessage(context)).resolves.toBe(true);

    expect(mockListUserLions).not.toHaveBeenCalled();
    expect(context.message.reply).toHaveBeenCalledWith(
      "Use `~lion <code, slug, name, owned ID, or nickname>` to inspect a lion."
    );
  });

  it("routes ~lion public IDs through catalog species formatting", async () => {
    const context = createContext({
      normalizedCommand: "~lion",
      args: ["L006"]
    });
    mockFindLionSpeciesByQuery.mockResolvedValue(species);

    await expect(handleRosterLionMessage(context)).resolves.toBe(true);

    expect(mockFindLionSpeciesByQuery).toHaveBeenCalledWith({}, "L006");
    expect(mockFormatLionSpeciesMessage).toHaveBeenCalledWith(species);
    expect(mockBuildLionImageReply).toHaveBeenCalledWith(
      "species lion",
      "assets/lions/cards/rdl-lion-006.jpg"
    );
    expect(mockListUserLions).not.toHaveBeenCalled();
    expect(mockFindUserLionFromList).not.toHaveBeenCalled();
    expect(context.message.reply).toHaveBeenCalledWith("species lion");
  });

  it("routes ~lion species slugs through catalog species formatting", async () => {
    const context = createContext({
      normalizedCommand: "~lion",
      args: ["rdl-lion-006"]
    });
    mockFindLionSpeciesByQuery.mockResolvedValue(species);

    await expect(handleRosterLionMessage(context)).resolves.toBe(true);

    expect(mockFindLionSpeciesByQuery).toHaveBeenCalledWith({}, "rdl-lion-006");
    expect(mockFormatLionSpeciesMessage).toHaveBeenCalledWith(species);
    expect(mockListUserLions).not.toHaveBeenCalled();
    expect(context.message.reply).toHaveBeenCalledWith("species lion");
  });

  it("routes ~lion official species names through catalog species formatting", async () => {
    const context = createContext({
      normalizedCommand: "~lion",
      args: ["RDL", "Lion", "006"]
    });
    mockFindLionSpeciesByQuery.mockResolvedValue(species);

    await expect(handleRosterLionMessage(context)).resolves.toBe(true);

    expect(mockFindLionSpeciesByQuery).toHaveBeenCalledWith({}, "RDL Lion 006");
    expect(mockFormatLionSpeciesMessage).toHaveBeenCalledWith(species);
    expect(mockListUserLions).not.toHaveBeenCalled();
    expect(context.message.reply).toHaveBeenCalledWith("species lion");
  });

  it("routes ~lion owned nicknames through roster fallback when no species matches", async () => {
    const lions = [ownedLion];
    const context = createContext({
      normalizedCommand: "~lion",
      args: ["Big", "Tony"]
    });
    mockListUserLions.mockResolvedValue(lions);
    mockFindUserLionFromList.mockReturnValue(ownedLion);
    mockGetFavoriteLion.mockResolvedValue({
      lionId: "lion_123"
    });

    await expect(handleRosterLionMessage(context)).resolves.toBe(true);

    expect(mockFindLionSpeciesByQuery).toHaveBeenCalledWith({}, "Big Tony");
    expect(mockListUserLions).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        userId: "user_123",
        limit: 100
      }
    );
    expect(mockFindUserLionFromList).toHaveBeenCalledWith(lions, "Big Tony");
    expect(mockFormatOwnedLionMessage).toHaveBeenCalledWith(
      ownedLion,
      "Mira Lee",
      {
        isFavorite: true
      }
    );
    expect(mockBuildLionImageReply).toHaveBeenCalledWith(
      "owned lion",
      "assets/lions/cards/rdl-lion-001.jpg"
    );
    expect(context.message.reply).toHaveBeenCalledWith("owned lion");
  });

  it("routes ~lion owned short IDs through roster fallback when no species matches", async () => {
    const lions = [ownedLion];
    const context = createContext({
      normalizedCommand: "~lion",
      args: ["#lion_123"]
    });
    mockListUserLions.mockResolvedValue(lions);
    mockFindUserLionFromList.mockReturnValue(ownedLion);

    await expect(handleRosterLionMessage(context)).resolves.toBe(true);

    expect(mockFindLionSpeciesByQuery).toHaveBeenCalledWith({}, "#lion_123");
    expect(mockFindUserLionFromList).toHaveBeenCalledWith(lions, "#lion_123");
    expect(mockFormatOwnedLionMessage).toHaveBeenCalledWith(
      ownedLion,
      "Mira Lee",
      {
        isFavorite: false
      }
    );
    expect(context.message.reply).toHaveBeenCalledWith("owned lion");
  });

  it("keeps ~lion not-found messaging across catalog and roster", async () => {
    const context = createContext({
      normalizedCommand: "~lion",
      args: ["Missing"]
    });
    mockListUserLions.mockResolvedValue([]);
    mockFindUserLionFromList.mockReturnValue(null);

    await expect(handleRosterLionMessage(context)).resolves.toBe(true);

    expect(mockFindLionSpeciesByQuery).toHaveBeenCalledWith({}, "Missing");
    expect(context.message.reply).toHaveBeenCalledWith(
      "I could not find that lion in the LionDen catalog or your roster."
    );
  });

  it("routes ~wild through active spawn lookup", async () => {
    const spawns = [
      {
        id: "spawn_123"
      }
    ];
    const context = createContext({
      normalizedCommand: "~wild",
      args: []
    });
    mockListActiveWildLionSpawns.mockResolvedValue(spawns);

    await expect(handleWildLionMessage(context)).resolves.toBe(true);

    expect(mockListActiveWildLionSpawns).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        now: createdAt
      }
    );
    expect(mockFormatWildLionStatusMessage).toHaveBeenCalledWith(spawns);
    expect(context.message.reply).toHaveBeenCalledWith("wild lions");
  });

  it("routes ~toplions through top-owned lion formatting", async () => {
    const entries = [
      {
        rank: 1,
        lion: ownedLion
      }
    ];
    const context = createContext({
      normalizedCommand: "~toplions",
      args: []
    });
    mockListTopOwnedLions.mockResolvedValue(entries);

    await expect(handleLeaderboardsLionMessage(context)).resolves.toBe(true);

    expect(mockListTopOwnedLions).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        limit: 10
      }
    );
    expect(mockFormatTopLionsMessage).toHaveBeenCalledWith({ entries });
    expect(context.message.reply).toHaveBeenCalledWith("top lions");
  });

  it("routes ~lionboard as the same top-lions board", async () => {
    const entries = [
      {
        rank: 1,
        lion: ownedLion
      }
    ];
    const context = createContext({
      normalizedCommand: "~lionboard",
      args: []
    });
    mockListTopOwnedLions.mockResolvedValue(entries);

    await expect(handleLeaderboardsLionMessage(context)).resolves.toBe(true);

    expect(mockListTopOwnedLions).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        limit: 10
      }
    );
    expect(mockFormatTopLionsMessage).toHaveBeenCalledWith({ entries });
    expect(context.message.reply).toHaveBeenCalledWith("top lions");
  });

  it("routes ~rarecatches through recent notable catch formatting", async () => {
    const entries = [
      {
        rank: 1
      }
    ];
    const context = createContext({
      normalizedCommand: "~rarecatches",
      args: []
    });
    mockListRecentNotableLionCatches.mockResolvedValue(entries);

    await expect(handleLeaderboardsLionMessage(context)).resolves.toBe(true);

    expect(mockListRecentNotableLionCatches).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        limit: 10
      }
    );
    expect(mockFormatRecentNotableLionCatchesMessage).toHaveBeenCalledWith({
      entries
    });
    expect(context.message.reply).toHaveBeenCalledWith("rare catches");
  });

  it("routes ~battleboard through top battle trainer formatting", async () => {
    const entries = [
      {
        rank: 1,
        wins: 2
      }
    ];
    const context = createContext({
      normalizedCommand: "~battleboard",
      args: []
    });
    mockListTopLionBattleTrainers.mockResolvedValue(entries);

    await expect(handleLeaderboardsLionMessage(context)).resolves.toBe(true);

    expect(mockListTopLionBattleTrainers).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        limit: 10
      }
    );
    expect(mockFormatLionBattleBoardMessage).toHaveBeenCalledWith({ entries });
    expect(context.message.reply).toHaveBeenCalledWith("battle board");
  });

  it("routes ~battlehistory with a mentioned user display name", async () => {
    const battles = [
      {
        id: "battle_123"
      }
    ];
    const context = createContext({
      normalizedCommand: "~battlehistory",
      args: [],
      mention: createMention({
        userId: "user_456",
        username: "Kai",
        displayName: "Kai Chen"
      })
    });
    mockListRecentLionBattles.mockResolvedValue(battles);

    await expect(handleBattleHistoryLionMessage(context)).resolves.toBe(true);

    expect(mockListRecentLionBattles).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        userId: "user_456",
        limit: 5
      }
    );
    expect(mockFormatLionBattleHistoryMessage).toHaveBeenCalledWith({
      battles,
      displayName: "Kai Chen"
    });
    expect(context.message.reply).toHaveBeenCalledWith("battle history");
  });

  it("routes ~battlestats for the message author by default", async () => {
    const stats = {
      userId: "user_123",
      displayName: "Stored Mira",
      wins: 1,
      losses: 0,
      battles: 1,
      winRate: 1
    };
    const context = createContext({
      normalizedCommand: "~battlestats",
      args: []
    });
    mockGetLionTrainerBattleStats.mockResolvedValue(stats);

    await expect(handleBattleHistoryLionMessage(context)).resolves.toBe(true);

    expect(mockGetLionTrainerBattleStats).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        userId: "user_123"
      }
    );
    expect(mockFormatLionTrainerBattleStatsMessage).toHaveBeenCalledWith({
      stats: {
        ...stats,
        displayName: "Mira Lee"
      },
      displayName: "Mira Lee"
    });
    expect(context.message.reply).toHaveBeenCalledWith("battle stats");
  });
});

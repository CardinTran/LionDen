import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Message } from "discord.js";

import type { LionMessageCommandContext } from "../src/bot/messages/lions/types.js";

const mockActivateLionChannelEffect = vi.fn();
const mockCalculateLionReleaseCoins = vi.fn();
const mockClearUserLionTeam = vi.fn();
const mockFindUserLionFromList = vi.fn();
const mockListLionShopItems = vi.fn();
const mockListUserLions = vi.fn();
const mockListUserLionTeam = vi.fn();
const mockNormalizeLionItemKey = vi.fn();
const mockPurchaseLionShopItem = vi.fn();
const mockReleaseUserLion = vi.fn();
const mockSetUserLionTeam = vi.fn();
const mockUseLionTrainingItem = vi.fn();

const mockFormatClearUserLionTeamMessage = vi.fn();
const mockFormatLionShopMessage = vi.fn();
const mockFormatReleaseUserLionMessage = vi.fn();
const mockFormatReleaseUserLionPreviewMessage = vi.fn();
const mockFormatSetUserLionTeamMessage = vi.fn();
const mockFormatUseLionTrainingItemMessage = vi.fn();
const mockFormatUserLionTeamMessage = vi.fn();

vi.mock("../src/lib/prisma.js", () => ({
  prisma: {}
}));

vi.mock("../src/features/lions/lion-creature.service.js", () => ({
  activateLionChannelEffect: mockActivateLionChannelEffect,
  calculateLionReleaseCoins: mockCalculateLionReleaseCoins,
  clearUserLionTeam: mockClearUserLionTeam,
  findUserLionFromList: mockFindUserLionFromList,
  listLionShopItems: mockListLionShopItems,
  listUserLions: mockListUserLions,
  listUserLionTeam: mockListUserLionTeam,
  normalizeLionItemKey: mockNormalizeLionItemKey,
  purchaseLionShopItem: mockPurchaseLionShopItem,
  releaseUserLion: mockReleaseUserLion,
  setUserLionTeam: mockSetUserLionTeam,
  useLionTrainingItem: mockUseLionTrainingItem
}));

vi.mock("../src/features/lions/lion-formatting.js", () => ({
  formatClearUserLionTeamMessage: mockFormatClearUserLionTeamMessage,
  formatLionShopMessage: mockFormatLionShopMessage,
  formatReleaseUserLionMessage: mockFormatReleaseUserLionMessage,
  formatReleaseUserLionPreviewMessage: mockFormatReleaseUserLionPreviewMessage,
  formatSetUserLionTeamMessage: mockFormatSetUserLionTeamMessage,
  formatUseLionTrainingItemMessage: mockFormatUseLionTrainingItemMessage,
  formatUserLionTeamMessage: mockFormatUserLionTeamMessage
}));

const { handleShopLionMessage } = await import(
  "../src/bot/messages/lions/shop.handler.js"
);
const { handleUseItemLionMessage } = await import(
  "../src/bot/messages/lions/use-item.handler.js"
);
const { handleReleaseLionMessage } = await import(
  "../src/bot/messages/lions/release.handler.js"
);
const { handleTeamLionMessage } = await import(
  "../src/bot/messages/lions/team.handler.js"
);

const createdAt = new Date("2026-05-25T12:00:00.000Z");

const normalizeItemKey = (value: string): string =>
  value.trim().toLowerCase().replace(/[\s_]+/g, "-");

const createMessage = (): Message =>
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
    channel: {
      isTextBased: vi.fn(() => true),
      send: vi.fn()
    },
    reply: vi.fn()
  }) as unknown as Message;

const createContext = (
  input: Pick<LionMessageCommandContext, "normalizedCommand" | "args">
): LionMessageCommandContext => ({
  message: createMessage(),
  guildId: "guild_123",
  normalizedCommand: input.normalizedCommand,
  args: input.args
});

const ownedLion = {
  id: "lion_123",
  species: {
    name: "Lion One",
    publicId: "L001"
  }
};

describe("non-battle lion message handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNormalizeLionItemKey.mockImplementation(normalizeItemKey);
    mockFormatLionShopMessage.mockReturnValue("shop message");
    mockFormatUseLionTrainingItemMessage.mockReturnValue("training item used");
    mockFormatReleaseUserLionPreviewMessage.mockReturnValue("release preview");
    mockFormatReleaseUserLionMessage.mockReturnValue("release complete");
    mockFormatUserLionTeamMessage.mockReturnValue("team message");
    mockFormatClearUserLionTeamMessage.mockReturnValue("team cleared");
    mockFormatSetUserLionTeamMessage.mockReturnValue("team set");
  });

  it("routes ~shop through the shop formatter", async () => {
    const items = [
      {
        itemKey: "basic-ball",
        name: "Basic Ball"
      }
    ];
    const context = createContext({
      normalizedCommand: "~shop",
      args: []
    });
    mockListLionShopItems.mockResolvedValue(items);

    await expect(handleShopLionMessage(context)).resolves.toBe(true);

    expect(mockListLionShopItems).toHaveBeenCalledWith({});
    expect(mockFormatLionShopMessage).toHaveBeenCalledWith(items);
    expect(context.message.reply).toHaveBeenCalledWith("shop message");
  });

  it("routes ~buy with quantity into the purchase service", async () => {
    const context = createContext({
      normalizedCommand: "~buy",
      args: ["basic", "ball", "3"]
    });
    mockPurchaseLionShopItem.mockResolvedValue({
      outcome: "purchased",
      item: {
        itemKey: "basic-ball",
        name: "Basic Ball",
        priceCoins: 10
      },
      profile: {
        coins: 70
      }
    });

    await expect(handleShopLionMessage(context)).resolves.toBe(true);

    expect(mockPurchaseLionShopItem).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        userId: "user_123",
        displayName: "Mira Lee",
        itemKey: "basic-ball",
        quantity: 3
      }
    );
    expect(context.message.reply).toHaveBeenCalledWith(
      "Bought 3 Basic Ball for 30 coins. You now have 70 coins."
    );
  });

  it("keeps ~buy usage guidance when no item is provided", async () => {
    const context = createContext({
      normalizedCommand: "~buy",
      args: []
    });

    await expect(handleShopLionMessage(context)).resolves.toBe(true);

    expect(mockPurchaseLionShopItem).not.toHaveBeenCalled();
    expect(context.message.reply).toHaveBeenCalledWith(
      "Use `~buy <item> [quantity]`, for example `~buy basic-ball 3`."
    );
  });

  it("keeps ball items routed to ~catch instead of ~use", async () => {
    const context = createContext({
      normalizedCommand: "~use",
      args: ["basic-ball"]
    });
    mockListLionShopItems.mockResolvedValue([
      {
        itemKey: "basic-ball",
        name: "Basic Ball",
        category: "BALL",
        effectType: "CATCH_MODIFIER"
      }
    ]);

    await expect(handleUseItemLionMessage(context)).resolves.toBe(true);

    expect(mockActivateLionChannelEffect).not.toHaveBeenCalled();
    expect(mockUseLionTrainingItem).not.toHaveBeenCalled();
    expect(context.message.reply).toHaveBeenCalledWith(
      "Basic Ball is a catching ball, so it is used with `~catch basic-ball` instead."
    );
  });

  it("routes training items through useLionTrainingItem", async () => {
    const result = {
      outcome: "used"
    };
    const context = createContext({
      normalizedCommand: "~use",
      args: ["training-treat", "L001"]
    });
    mockListLionShopItems.mockResolvedValue([
      {
        itemKey: "training-treat",
        name: "Training Treat",
        category: "BOOST",
        effectType: "TRAINING_XP"
      }
    ]);
    mockUseLionTrainingItem.mockResolvedValue(result);

    await expect(handleUseItemLionMessage(context)).resolves.toBe(true);

    expect(mockUseLionTrainingItem).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        userId: "user_123",
        itemKey: "training-treat",
        lionQuery: "L001"
      }
    );
    expect(mockFormatUseLionTrainingItemMessage).toHaveBeenCalledWith({
      result
    });
    expect(context.message.reply).toHaveBeenCalledWith("training item used");
  });

  it("routes active-use items through channel effect activation", async () => {
    const expiresAt = new Date("2026-05-25T12:30:00.000Z");
    const context = createContext({
      normalizedCommand: "~use",
      args: ["spawn-lure"]
    });
    mockListLionShopItems.mockResolvedValue([
      {
        itemKey: "spawn-lure",
        name: "Spawn Lure",
        category: "BOOST",
        effectType: "SPAWN_BOOST",
        effectValue: 2
      }
    ]);
    mockActivateLionChannelEffect.mockResolvedValue({
      outcome: "activated",
      effect: {
        expiresAt
      },
      activeEffect: null
    });

    await expect(handleUseItemLionMessage(context)).resolves.toBe(true);

    expect(mockActivateLionChannelEffect).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        channelId: "channel_123",
        userId: "user_123",
        itemKey: "spawn-lure",
        effectType: "SPAWN_BOOST",
        effectValue: 2,
        durationMinutes: 30,
        now: createdAt
      }
    );
    expect(context.message.reply).toHaveBeenCalledWith(
      "Mira Lee activated Spawn Lure in this channel until <t:1779712200:R>."
    );
  });

  it("shows a release preview before confirmation", async () => {
    const lions = [ownedLion];
    const context = createContext({
      normalizedCommand: "~release",
      args: ["L001"]
    });
    mockListUserLions.mockResolvedValue(lions);
    mockFindUserLionFromList.mockReturnValue(ownedLion);
    mockCalculateLionReleaseCoins.mockReturnValue(42);

    await expect(handleReleaseLionMessage(context)).resolves.toBe(true);

    expect(mockListUserLions).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        userId: "user_123",
        limit: 100
      }
    );
    expect(mockFindUserLionFromList).toHaveBeenCalledWith(lions, "L001");
    expect(mockFormatReleaseUserLionPreviewMessage).toHaveBeenCalledWith({
      lion: ownedLion,
      coinsAwarded: 42
    });
    expect(context.message.reply).toHaveBeenCalledWith("release preview");
  });

  it("routes confirmed releases through releaseUserLion", async () => {
    const result = {
      outcome: "released"
    };
    const context = createContext({
      normalizedCommand: "~release",
      args: ["L001", "confirm"]
    });
    mockReleaseUserLion.mockResolvedValue(result);

    await expect(handleReleaseLionMessage(context)).resolves.toBe(true);

    expect(mockReleaseUserLion).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        userId: "user_123",
        displayName: "Mira Lee",
        query: "L001"
      }
    );
    expect(mockFormatReleaseUserLionMessage).toHaveBeenCalledWith(result);
    expect(context.message.reply).toHaveBeenCalledWith("release complete");
  });

  it("routes ~team view through the team formatter", async () => {
    const team = [
      {
        slot: 1
      }
    ];
    const context = createContext({
      normalizedCommand: "~team",
      args: []
    });
    mockListUserLionTeam.mockResolvedValue(team);

    await expect(handleTeamLionMessage(context)).resolves.toBe(true);

    expect(mockListUserLionTeam).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        userId: "user_123"
      }
    );
    expect(mockFormatUserLionTeamMessage).toHaveBeenCalledWith({
      team,
      displayName: "Mira Lee"
    });
    expect(context.message.reply).toHaveBeenCalledWith("team message");
  });

  it("routes ~team set with the remaining args as lion queries", async () => {
    const result = {
      outcome: "set"
    };
    const context = createContext({
      normalizedCommand: "~team",
      args: ["set", "L001", "L002", "L003"]
    });
    mockSetUserLionTeam.mockResolvedValue(result);

    await expect(handleTeamLionMessage(context)).resolves.toBe(true);

    expect(mockSetUserLionTeam).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        userId: "user_123",
        queries: ["L001", "L002", "L003"]
      }
    );
    expect(mockFormatSetUserLionTeamMessage).toHaveBeenCalledWith(result);
    expect(context.message.reply).toHaveBeenCalledWith("team set");
  });

  it("keeps ~team subcommand guidance for unknown subcommands", async () => {
    const context = createContext({
      normalizedCommand: "~team",
      args: ["rotate"]
    });

    await expect(handleTeamLionMessage(context)).resolves.toBe(true);

    expect(mockSetUserLionTeam).not.toHaveBeenCalled();
    expect(mockClearUserLionTeam).not.toHaveBeenCalled();
    expect(context.message.reply).toHaveBeenCalledWith(
      "Use `~team`, `~team set <lion1> <lion2> <lion3>`, or `~team clear`."
    );
  });
});

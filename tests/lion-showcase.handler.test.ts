import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Message } from "discord.js";

import type { LionMessageCommandContext } from "../src/bot/messages/lions/types.js";

const mockClearFavoriteLion = vi.fn();
const mockSetFavoriteLion = vi.fn();
const mockShowcaseOwnedLion = vi.fn();
const mockFormatClearFavoriteLionMessage = vi.fn();
const mockFormatSetFavoriteLionMessage = vi.fn();
const mockFormatShowcaseOwnedLionMessage = vi.fn();
const mockBuildLionImageReply = vi.fn((content: string) => content);

vi.mock("../src/lib/prisma.js", () => ({
  prisma: {}
}));

vi.mock("../src/features/lions/lion-showcase.service.js", () => ({
  clearFavoriteLion: mockClearFavoriteLion,
  setFavoriteLion: mockSetFavoriteLion,
  showcaseOwnedLion: mockShowcaseOwnedLion
}));

vi.mock("../src/features/lions/lion-formatting.js", () => ({
  formatClearFavoriteLionMessage: mockFormatClearFavoriteLionMessage,
  formatSetFavoriteLionMessage: mockFormatSetFavoriteLionMessage,
  formatShowcaseOwnedLionMessage: mockFormatShowcaseOwnedLionMessage
}));

vi.mock("../src/bot/messages/lions/image-reply.js", () => ({
  buildLionImageReply: mockBuildLionImageReply
}));

const { handleFavoriteLionMessage } = await import(
  "../src/bot/messages/lions/favorite.handler.js"
);
const { handleShowcaseLionMessage } = await import(
  "../src/bot/messages/lions/showcase.handler.js"
);

const createMessage = (): Message =>
  ({
    guildId: "guild_123",
    author: {
      id: "user_123",
      username: "Mira"
    },
    member: {
      displayName: "Mira Lee"
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

describe("lion showcase message handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFormatClearFavoriteLionMessage.mockReturnValue("favorite cleared");
    mockFormatSetFavoriteLionMessage.mockReturnValue("favorite set");
    mockFormatShowcaseOwnedLionMessage.mockReturnValue("showcase message");
  });

  it("routes ~favorite to set the caller's favorite lion", async () => {
    const result = {
      outcome: "set"
    };
    const context = createContext({
      normalizedCommand: "~favorite",
      args: ["Lucky", "Lion"]
    });
    mockSetFavoriteLion.mockResolvedValue(result);

    await expect(handleFavoriteLionMessage(context)).resolves.toBe(true);

    expect(mockSetFavoriteLion).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        userId: "user_123",
        query: "Lucky Lion"
      }
    );
    expect(mockFormatSetFavoriteLionMessage).toHaveBeenCalledWith(result);
    expect(context.message.reply).toHaveBeenCalledWith("favorite set");
  });

  it("supports ~favorite clear", async () => {
    const result = {
      outcome: "cleared",
      clearedCount: 1
    };
    const context = createContext({
      normalizedCommand: "~favorite",
      args: ["clear"]
    });
    mockClearFavoriteLion.mockResolvedValue(result);

    await expect(handleFavoriteLionMessage(context)).resolves.toBe(true);

    expect(mockClearFavoriteLion).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        userId: "user_123"
      }
    );
    expect(mockFormatClearFavoriteLionMessage).toHaveBeenCalledWith(result);
    expect(context.message.reply).toHaveBeenCalledWith("favorite cleared");
  });

  it("shows favorite usage when no lion is provided", async () => {
    const context = createContext({
      normalizedCommand: "~favorite",
      args: []
    });

    await expect(handleFavoriteLionMessage(context)).resolves.toBe(true);

    expect(mockSetFavoriteLion).not.toHaveBeenCalled();
    expect(context.message.reply).toHaveBeenCalledWith(
      "Use `~favorite <lion>` to set your favorite lion, or `~favorite clear` to clear it."
    );
  });

  it("routes ~showcase with explicit and favorite-default queries", async () => {
    const result = {
      outcome: "showcase",
      showcase: {
        lion: {
          species: {
            imagePath: "assets/lions/cards/rdl-lion-001.jpg"
          }
        }
      }
    };
    const explicitContext = createContext({
      normalizedCommand: "~showcase",
      args: ["L001"]
    });
    const favoriteContext = createContext({
      normalizedCommand: "~showcase",
      args: []
    });
    mockShowcaseOwnedLion.mockResolvedValue(result);

    await expect(handleShowcaseLionMessage(explicitContext)).resolves.toBe(true);
    await expect(handleShowcaseLionMessage(favoriteContext)).resolves.toBe(true);

    expect(mockShowcaseOwnedLion).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        userId: "user_123",
        displayName: "Mira Lee",
        query: "L001"
      }
    );
    expect(mockShowcaseOwnedLion).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        userId: "user_123",
        displayName: "Mira Lee",
        query: ""
      }
    );
    expect(mockFormatShowcaseOwnedLionMessage).toHaveBeenCalledWith(result);
    expect(mockBuildLionImageReply).toHaveBeenCalledWith(
      "showcase message",
      "assets/lions/cards/rdl-lion-001.jpg"
    );
    expect(explicitContext.message.reply).toHaveBeenCalledWith("showcase message");
    expect(favoriteContext.message.reply).toHaveBeenCalledWith("showcase message");
  });
});

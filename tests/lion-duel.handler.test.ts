import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Message } from "discord.js";

import type {
  LionSpeciesRecord,
  UserLionTeamSlotWithLionRecord,
  UserLionWithSpeciesRecord
} from "../src/features/lions/lion-creature.service.js";

const mockListUserLionTeam = vi.fn();
const mockRecordDuelCompletionHousePointsSafely = vi.fn();

vi.mock("../src/lib/prisma.js", () => ({
  prisma: {}
}));

vi.mock("../src/features/lions/lion-creature.service.js", async () => {
  const actual = await vi.importActual<
    typeof import("../src/features/lions/lion-creature.service.js")
  >("../src/features/lions/lion-creature.service.js");

  return {
    ...actual,
    listUserLionTeam: mockListUserLionTeam
  };
});

vi.mock("../src/features/houses/house-hooks.js", () => ({
  recordDuelCompletionHousePointsSafely:
    mockRecordDuelCompletionHousePointsSafely
}));

const {
  buildLionDuelActionComponents,
  handleDuelLionMessage,
  handleLionDuelButton,
  isLionDuelButtonCustomId
} = await import("../src/bot/messages/lions/duel.handler.js");
const { clearLionDuelStore, createLionDuelChallenge } =
  await import("../src/features/lions/lion-duel.service.js");

const now = new Date("2026-05-25T12:00:00.000Z");

const buildSpecies = (
  overrides: Partial<LionSpeciesRecord> = {}
): LionSpeciesRecord => ({
  id: "species_123",
  publicId: "L001",
  slug: "rdl-lion-001",
  name: "RDL Lion 001",
  imagePath: "assets/lions/cards/rdl-lion-001.jpg",
  rarity: "COMMON",
  baseCatchRate: 70,
  baseValue: 1,
  spawnWeight: 100,
  primaryType: "NEUTRAL",
  secondaryType: null,
  baseHp: 50,
  baseAttack: 10,
  baseDefense: 10,
  baseSpeed: 10,
  abilityKey: "steady-heart",
  abilityName: "Steady Heart",
  abilityDescription: "A dependable passive trait.",
  description: "A local test lion.",
  isEnabled: true,
  createdAt: now,
  updatedAt: now,
  ...overrides
});

const buildOwnedLion = (
  overrides: Partial<UserLionWithSpeciesRecord> = {}
): UserLionWithSpeciesRecord => ({
  id: "owned_123",
  guildId: "guild_123",
  userId: "user_123",
  ownerDisplayName: "Mira",
  lionSpeciesId: "species_123",
  nickname: null,
  level: 5,
  experience: 0,
  sourceType: "WILD_CATCH",
  sourceReferenceId: null,
  lastTrainedAt: null,
  lastBattledAt: null,
  acquiredAt: now,
  createdAt: now,
  updatedAt: now,
  species: buildSpecies(),
  ...overrides
});

const buildTeamSlot = (
  lion: UserLionWithSpeciesRecord
): UserLionTeamSlotWithLionRecord => ({
  id: `slot_${lion.id}`,
  guildId: lion.guildId,
  userId: lion.userId,
  slot: 1,
  userLionId: lion.id,
  createdAt: now,
  updatedAt: now,
  lion
});

const createMessage = (): Message =>
  ({
    guildId: "guild_123",
    channelId: "channel_123",
    createdAt: now,
    author: {
      id: "user_123",
      username: "Mira"
    },
    member: {
      displayName: "Mira Lee"
    },
    mentions: {
      users: {
        first: () => ({
          id: "user_456",
          username: "Cardin",
          bot: false
        })
      },
      members: {
        first: () => ({
          displayName: "Cardin Tran"
        })
      }
    },
    reply: vi.fn()
  }) as unknown as Message;

const createButtonInteraction = (customId: string, userId = "user_456") => ({
  customId,
  guildId: "guild_123",
  user: {
    id: userId
  },
  replied: false,
  deferred: false,
  reply: vi.fn(),
  followUp: vi.fn(),
  update: vi.fn()
});

describe("lion duel message handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearLionDuelStore();
    mockRecordDuelCompletionHousePointsSafely.mockResolvedValue(undefined);
  });

  it("starts a pending duel using each trainer's lead team lion", async () => {
    const message = createMessage();
    mockListUserLionTeam
      .mockResolvedValueOnce([
        buildTeamSlot(
          buildOwnedLion({
            id: "owned_challenger",
            userId: "user_123"
          })
        )
      ])
      .mockResolvedValueOnce([
        buildTeamSlot(
          buildOwnedLion({
            id: "owned_opponent",
            userId: "user_456",
            ownerDisplayName: "Cardin"
          })
        )
      ]);

    await expect(
      handleDuelLionMessage({
        message,
        guildId: "guild_123",
        normalizedCommand: "~duel",
        args: ["@Cardin"]
      })
    ).resolves.toBe(true);

    expect(mockListUserLionTeam).toHaveBeenCalledTimes(2);
    expect(message.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("LionDen 1v1 duel prototype"),
        components: expect.any(Array)
      })
    );
  });

  it("keeps non-duel commands available for later handlers", async () => {
    await expect(
      handleDuelLionMessage({
        message: createMessage(),
        guildId: "guild_123",
        normalizedCommand: "~battle",
        args: []
      })
    ).resolves.toBe(false);
  });

  it("shows usage when no valid opponent is mentioned", async () => {
    const message = {
      ...createMessage(),
      mentions: {
        users: {
          first: () => undefined
        }
      }
    } as unknown as Message;

    await handleDuelLionMessage({
      message,
      guildId: "guild_123",
      normalizedCommand: "~duel",
      args: []
    });

    expect(message.reply).toHaveBeenCalledWith(
      "Use `~duel @user` to start a 1v1 lion duel prototype."
    );
  });

  it("handles duel accept buttons by editing the duel message", async () => {
    const buttonNow = new Date();
    const created = createLionDuelChallenge({
      guildId: "guild_123",
      channelId: "channel_123",
      challengerUserId: "user_123",
      challengerDisplayName: "Mira",
      challengerLion: buildOwnedLion({
        id: "owned_challenger",
        userId: "user_123"
      }),
      opponentUserId: "user_456",
      opponentDisplayName: "Cardin",
      opponentLion: buildOwnedLion({
        id: "owned_opponent",
        userId: "user_456"
      }),
      now: buttonNow
    });
    const interaction = createButtonInteraction(
      `lionduel:${created.duel.id}:accept`
    );

    await expect(handleLionDuelButton(interaction as never)).resolves.toBe(
      true
    );

    expect(interaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("Turn 1:"),
        components: expect.any(Array)
      })
    );
    expect(mockRecordDuelCompletionHousePointsSafely).not.toHaveBeenCalled();
  });

  it("records House points for both participants when a duel completes", async () => {
    const buttonNow = new Date();
    const created = createLionDuelChallenge({
      guildId: "guild_123",
      channelId: "channel_123",
      challengerUserId: "user_123",
      challengerDisplayName: "Mira",
      challengerLion: buildOwnedLion({
        id: "owned_challenger",
        userId: "user_123",
        level: 30,
        species: buildSpecies({
          baseAttack: 80,
          baseSpeed: 50
        })
      }),
      opponentUserId: "user_456",
      opponentDisplayName: "Cardin",
      opponentLion: buildOwnedLion({
        id: "owned_opponent",
        userId: "user_456",
        species: buildSpecies({
          baseHp: 10,
          baseDefense: 1,
          baseSpeed: 1
        })
      }),
      now: buttonNow
    });
    await handleLionDuelButton(
      createButtonInteraction(`lionduel:${created.duel.id}:accept`) as never
    );
    const interaction = createButtonInteraction(
      `lionduel:${created.duel.id}:basic`,
      "user_123"
    );

    await expect(handleLionDuelButton(interaction as never)).resolves.toBe(
      true
    );

    expect(mockRecordDuelCompletionHousePointsSafely).toHaveBeenCalledTimes(2);
    expect(mockRecordDuelCompletionHousePointsSafely).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        userId: "user_123",
        duelId: created.duel.id
      }
    );
    expect(mockRecordDuelCompletionHousePointsSafely).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        userId: "user_456",
        duelId: created.duel.id
      }
    );
    expect(interaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("won."),
        components: []
      })
    );
  });

  it("does not record House points when a duel is declined", async () => {
    const created = createLionDuelChallenge({
      guildId: "guild_123",
      channelId: "channel_123",
      challengerUserId: "user_123",
      challengerDisplayName: "Mira",
      challengerLion: buildOwnedLion({
        id: "owned_challenger",
        userId: "user_123"
      }),
      opponentUserId: "user_456",
      opponentDisplayName: "Cardin",
      opponentLion: buildOwnedLion({
        id: "owned_opponent",
        userId: "user_456"
      }),
      now
    });
    const interaction = createButtonInteraction(
      `lionduel:${created.duel.id}:decline`
    );

    await handleLionDuelButton(interaction as never);

    expect(mockRecordDuelCompletionHousePointsSafely).not.toHaveBeenCalled();
    expect(interaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("Duel canceled.")
      })
    );
  });

  it("does not record House points when a duel is canceled", async () => {
    const created = createLionDuelChallenge({
      guildId: "guild_123",
      channelId: "channel_123",
      challengerUserId: "user_123",
      challengerDisplayName: "Mira",
      challengerLion: buildOwnedLion({
        id: "owned_challenger",
        userId: "user_123"
      }),
      opponentUserId: "user_456",
      opponentDisplayName: "Cardin",
      opponentLion: buildOwnedLion({
        id: "owned_opponent",
        userId: "user_456"
      }),
      now
    });
    const interaction = createButtonInteraction(
      `lionduel:${created.duel.id}:cancel`,
      "user_123"
    );

    await handleLionDuelButton(interaction as never);

    expect(mockRecordDuelCompletionHousePointsSafely).not.toHaveBeenCalled();
    expect(interaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("Duel canceled.")
      })
    );
  });

  it("replies ephemerally when a non-participant presses a duel button", async () => {
    const buttonNow = new Date();
    const created = createLionDuelChallenge({
      guildId: "guild_123",
      channelId: "channel_123",
      challengerUserId: "user_123",
      challengerDisplayName: "Mira",
      challengerLion: buildOwnedLion({
        id: "owned_challenger",
        userId: "user_123"
      }),
      opponentUserId: "user_456",
      opponentDisplayName: "Cardin",
      opponentLion: buildOwnedLion({
        id: "owned_opponent",
        userId: "user_456"
      }),
      now: buttonNow
    });
    const interaction = createButtonInteraction(
      `lionduel:${created.duel.id}:accept`,
      "user_789"
    );

    await handleLionDuelButton(interaction as never);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: "That duel button is not for you.",
      ephemeral: true
    });
    expect(interaction.update).not.toHaveBeenCalled();
    expect(mockRecordDuelCompletionHousePointsSafely).not.toHaveBeenCalled();
  });

  it("identifies duel button custom IDs", () => {
    expect(isLionDuelButtonCustomId("lionduel:abc:accept")).toBe(true);
    expect(isLionDuelButtonCustomId("practice:rsvp:GOING:session")).toBe(false);
  });

  it("builds no action buttons once a duel is not active", () => {
    const created = createLionDuelChallenge({
      guildId: "guild_123",
      channelId: "channel_123",
      challengerUserId: "user_123",
      challengerDisplayName: "Mira",
      challengerLion: buildOwnedLion({
        id: "owned_challenger",
        userId: "user_123"
      }),
      opponentUserId: "user_456",
      opponentDisplayName: "Cardin",
      opponentLion: buildOwnedLion({
        id: "owned_opponent",
        userId: "user_456"
      }),
      now
    });

    expect(buildLionDuelActionComponents(created.duel)).toEqual([]);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Message } from "discord.js";

const mockFindPendingLionBattleChallengeForOpponent = vi.fn();
const mockListUserLionTeam = vi.fn();
const mockGetUserLionBattleCooldown = vi.fn();
const mockAcceptLionBattleChallenge = vi.fn();
const mockDeclineLionBattleChallenge = vi.fn();
const mockAwardBattleLionExperience = vi.fn();
const mockAttemptCatchWildLion = vi.fn();
const mockBuildTrainingNpcLionTeam = vi.fn();
const mockRecordLionBattle = vi.fn();
const mockMarkLionBattleChallengeResolved = vi.fn();
const mockSyncDefaultLionData = vi.fn();
const mockTrainUserLion = vi.fn();
const mockResolveAutoLionTeamBattle = vi.fn();
const mockGetLionBattleMvpLionId = vi.fn();
const mockRecordWeeklyChallengeProgressSafely = vi.fn();
const mockRecordLionCatchHousePointsSafely = vi.fn();
const mockRecordLionTrainingHousePointsSafely = vi.fn();
const mockRecordTrainingBattleHousePointsSafely = vi.fn();
const mockRecordDuelCompletionHousePointsSafely = vi.fn();

vi.mock("../src/lib/prisma.js", () => ({
  prisma: {}
}));

vi.mock("../src/features/lions/lion-battle.service.js", () => ({
  resolveAutoLionTeamBattle: mockResolveAutoLionTeamBattle,
  getLionBattleMvpLionId: mockGetLionBattleMvpLionId
}));

vi.mock("../src/features/lions/lion-formatting.js", () => ({
  formatClearUserLionTeamMessage: vi.fn(),
  formatExistingLionBattleChallengeMessage: vi.fn(),
  formatLionBattleBoardMessage: vi.fn(),
  formatLionBattleChallengeAcceptedMessage: vi.fn(() => "challenge accepted"),
  formatLionBattleChallengeCanceledMessage: vi.fn(),
  formatLionBattleChallengeDeclinedMessage: vi.fn(() => "challenge declined"),
  formatLionBattleChallengeMessage: vi.fn(),
  formatLionHelpMessage: vi.fn(),
  formatLionBattleHistoryMessage: vi.fn(),
  formatLionInventoryMessage: vi.fn(),
  formatLionShopMessage: vi.fn(),
  formatOwnedLionMessage: vi.fn(),
  formatRecentNotableLionCatchesMessage: vi.fn(),
  formatReleaseUserLionMessage: vi.fn(),
  formatReleaseUserLionPreviewMessage: vi.fn(),
  formatSetUserLionNicknameMessage: vi.fn(),
  formatSetUserLionTeamMessage: vi.fn(),
  formatTeamBattleLionMessage: vi.fn(() => "battle summary"),
  formatLionTrainerBattleStatsMessage: vi.fn(),
  formatTopLionsMessage: vi.fn(),
  formatTrainLionMessage: vi.fn(),
  formatUseLionTrainingItemMessage: vi.fn(),
  formatUserLionTeamMessage: vi.fn(),
  formatUserLionsMessage: vi.fn(),
  formatWildLionStatusMessage: vi.fn()
}));

vi.mock("../src/features/lions/lion-creature.service.js", () => ({
  acceptLionBattleChallenge: mockAcceptLionBattleChallenge,
  activateLionChannelEffect: vi.fn(),
  awardBattleLionExperience: mockAwardBattleLionExperience,
  attemptCatchWildLion: mockAttemptCatchWildLion,
  buildTrainingNpcLionTeam: mockBuildTrainingNpcLionTeam,
  calculateLionReleaseCoins: vi.fn(),
  cancelLionBattleChallenge: vi.fn(),
  clearUserLionTeam: vi.fn(),
  createLionBattleChallenge: vi.fn(),
  declineLionBattleChallenge: mockDeclineLionBattleChallenge,
  findUserLionFromList: vi.fn(),
  findPendingLionBattleChallengeForOpponent:
    mockFindPendingLionBattleChallengeForOpponent,
  getLionTrainerBattleStats: vi.fn(),
  getOwnedLionDisplayName: vi.fn(() => "Alpha"),
  getUserLionBattleCooldown: mockGetUserLionBattleCooldown,
  HIGH_LEVEL_WILD_LION_THRESHOLD: 25,
  LION_BATTLE_LOSS_XP: 18,
  LION_BATTLE_WIN_XP: 45,
  LION_TRAINING_NPC_DISPLAY_NAME: "Training Hall",
  LION_TRAINING_NPC_USER_ID: "lionden-training-npc",
  listActiveWildLionSpawns: vi.fn(),
  listLionShopItems: vi.fn(),
  listRecentLionBattles: vi.fn(),
  listRecentNotableLionCatches: vi.fn(),
  listTopLionBattleTrainers: vi.fn(),
  listTopOwnedLions: vi.fn(),
  listUserItemInventory: vi.fn(),
  listUserLionTeam: mockListUserLionTeam,
  listUserLions: vi.fn(),
  markLionBattleChallengeResolved: mockMarkLionBattleChallengeResolved,
  normalizeLionItemKey: vi.fn((value: string) => value),
  purchaseLionShopItem: vi.fn(),
  recordLionBattle: mockRecordLionBattle,
  releaseUserLion: vi.fn(),
  setUserLionNickname: vi.fn(),
  setUserLionTeam: vi.fn(),
  syncDefaultLionData: mockSyncDefaultLionData,
  trainUserLion: mockTrainUserLion,
  useLionTrainingItem: vi.fn()
}));

vi.mock("../src/features/challenges/weekly-challenge-hooks.js", () => ({
  recordWeeklyChallengeProgressSafely: mockRecordWeeklyChallengeProgressSafely
}));

vi.mock("../src/features/houses/house-hooks.js", () => ({
  recordLionCatchHousePointsSafely: mockRecordLionCatchHousePointsSafely,
  recordLionTrainingHousePointsSafely: mockRecordLionTrainingHousePointsSafely,
  recordTrainingBattleHousePointsSafely:
    mockRecordTrainingBattleHousePointsSafely,
  recordDuelCompletionHousePointsSafely:
    mockRecordDuelCompletionHousePointsSafely
}));

const { handleLionCreatureMessage } =
  await import("../src/bot/messages/lion-creatures.js");

const now = new Date("2026-05-18T12:00:00.000Z");

const buildMessage = (content: string) =>
  ({
    content,
    guildId: "guild_123",
    channelId: "channel_123",
    createdAt: now,
    author: {
      id: "user_456",
      username: "Mira"
    },
    member: {
      displayName: "Mira"
    },
    mentions: {
      users: {
        first: () => undefined
      },
      members: {
        first: () => undefined
      }
    },
    reply: vi.fn()
  }) as unknown as Message;

const challenge = {
  id: "challenge_123",
  guildId: "guild_123",
  channelId: "channel_123",
  challengerUserId: "user_123",
  challengerDisplayName: "Cardin",
  opponentUserId: "user_456",
  opponentDisplayName: "Mira",
  status: "PENDING",
  expiresAt: new Date(now.getTime() + 60_000),
  acceptedAt: null,
  declinedAt: null,
  resolvedBattleRecordId: null,
  createdAt: now,
  updatedAt: now
};

const buildTeamSlot = (
  lionId: string,
  userId: string,
  displayName: string
) => ({
  id: `slot_${lionId}`,
  guildId: "guild_123",
  userId,
  slot: 1,
  userLionId: lionId,
  createdAt: now,
  updatedAt: now,
  lion: {
    id: lionId,
    guildId: "guild_123",
    userId,
    ownerDisplayName: displayName,
    lionSpeciesId: `species_${lionId}`,
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
    species: {
      id: `species_${lionId}`,
      publicId: `L${lionId}`,
      slug: `lion-${lionId}`,
      name: `Lion ${lionId}`,
      imagePath: "lion.png",
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
      description: "A test lion.",
      isEnabled: true,
      createdAt: now,
      updatedAt: now
    }
  }
});

describe("lion battle message routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSyncDefaultLionData.mockResolvedValue(undefined);
    mockRecordWeeklyChallengeProgressSafely.mockResolvedValue(undefined);
    mockRecordLionCatchHousePointsSafely.mockResolvedValue(undefined);
    mockRecordLionTrainingHousePointsSafely.mockResolvedValue(undefined);
    mockRecordTrainingBattleHousePointsSafely.mockResolvedValue(undefined);
  });

  it("records House points after a successful wild lion catch", async () => {
    const spawn = {
      id: "spawn_123",
      level: 4,
      species: {
        name: "Test Lion",
        rarity: "COMMON"
      }
    };
    mockAttemptCatchWildLion.mockResolvedValue({
      outcome: "caught",
      spawn,
      item: {
        name: "Basic Ball"
      },
      ownedLion: {
        id: "owned_123",
        level: 1,
        species: {
          name: "Test Lion",
          publicId: "L001",
          rarity: "COMMON"
        }
      },
      catchChance: 80
    });

    const message = buildMessage("~catch basic-ball");
    const handled = await handleLionCreatureMessage(message);

    expect(handled).toBe(true);
    expect(mockRecordLionCatchHousePointsSafely).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        userId: "user_456",
        sourceId: "lion_catch:spawn_123:user_456"
      }
    );
    expect(message.reply).toHaveBeenCalledWith(
      expect.stringContaining("caught Lv. 1")
    );
  });

  it("does not record House points after a failed wild lion catch", async () => {
    mockAttemptCatchWildLion.mockResolvedValue({
      outcome: "missed",
      spawn: {
        species: {
          name: "Test Lion"
        }
      },
      item: {
        name: "Basic Ball"
      },
      ownedLion: null,
      catchChance: 50
    });

    const message = buildMessage("~catch basic-ball");
    const handled = await handleLionCreatureMessage(message);

    expect(handled).toBe(true);
    expect(mockRecordLionCatchHousePointsSafely).not.toHaveBeenCalled();
    expect(message.reply).toHaveBeenCalledWith(
      "Basic Ball failed. Test Lion is still here."
    );
  });

  it("records House points after successful lion training", async () => {
    mockTrainUserLion.mockResolvedValue({
      outcome: "trained",
      result: {
        lion: {
          id: "owned_123"
        }
      },
      cooldownEndsAt: new Date(now.getTime() + 60_000)
    });

    const message = buildMessage("~train L001");
    const handled = await handleLionCreatureMessage(message);

    expect(handled).toBe(true);
    expect(mockRecordLionTrainingHousePointsSafely).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        userId: "user_456",
        sourceId: "lion_training:owned_123:2026-05-18T12:00:00.000Z:user_456"
      }
    );
  });

  it("does not record House points when lion training is on cooldown", async () => {
    mockTrainUserLion.mockResolvedValue({
      outcome: "on_cooldown",
      result: null,
      cooldownEndsAt: new Date(now.getTime() + 60_000)
    });

    const message = buildMessage("~train L001");
    const handled = await handleLionCreatureMessage(message);

    expect(handled).toBe(true);
    expect(mockRecordLionTrainingHousePointsSafely).not.toHaveBeenCalled();
  });

  it("accepts the documented `~battle accept` syntax", async () => {
    mockFindPendingLionBattleChallengeForOpponent.mockResolvedValue(challenge);
    mockListUserLionTeam
      .mockResolvedValueOnce([buildTeamSlot("1", "user_123", "Cardin")])
      .mockResolvedValueOnce([buildTeamSlot("2", "user_456", "Mira")]);
    mockGetUserLionBattleCooldown.mockResolvedValue({
      allowed: true,
      cooldownEndsAt: null
    });
    mockAcceptLionBattleChallenge.mockResolvedValue({
      outcome: "accepted",
      challenge: {
        ...challenge,
        status: "ACCEPTED",
        acceptedAt: now
      }
    });
    mockResolveAutoLionTeamBattle.mockReturnValue({
      firstTeam: [buildTeamSlot("1", "user_123", "Cardin").lion],
      secondTeam: [buildTeamSlot("2", "user_456", "Mira").lion],
      participantLionIds: {
        first: ["1"],
        second: ["2"]
      },
      winnerSide: "first",
      loserSide: "second",
      rounds: [],
      finalHp: {
        "1": 12,
        "2": 0
      }
    });
    mockGetLionBattleMvpLionId.mockReturnValue("1");
    mockAwardBattleLionExperience.mockResolvedValue({
      outcome: "awarded",
      result: {
        lion: buildTeamSlot("1", "user_123", "Cardin").lion,
        gainedExperience: 45,
        previousLevel: 5,
        nextLevel: 5,
        leveledUp: false
      }
    });
    mockRecordLionBattle.mockResolvedValue({
      id: "battle_123"
    });
    mockMarkLionBattleChallengeResolved.mockResolvedValue(undefined);

    const message = buildMessage("~battle accept");
    const handled = await handleLionCreatureMessage(message);

    expect(handled).toBe(true);
    expect(mockAcceptLionBattleChallenge).toHaveBeenCalledOnce();
    expect(message.reply).toHaveBeenCalledWith(
      "challenge accepted\nbattle summary"
    );
  });

  it("accepts the documented `~battle decline` syntax", async () => {
    mockDeclineLionBattleChallenge.mockResolvedValue({
      outcome: "declined",
      challenge: {
        ...challenge,
        status: "DECLINED",
        declinedAt: now
      }
    });

    const message = buildMessage("~battle decline");
    const handled = await handleLionCreatureMessage(message);

    expect(handled).toBe(true);
    expect(mockDeclineLionBattleChallenge).toHaveBeenCalledOnce();
    expect(message.reply).toHaveBeenCalledWith("challenge declined");
  });

  it("records House points after a completed Training Hall battle", async () => {
    mockListUserLionTeam.mockResolvedValue([
      buildTeamSlot("1", "user_456", "Mira")
    ]);
    mockGetUserLionBattleCooldown.mockResolvedValue({
      allowed: true,
      cooldownEndsAt: null
    });
    mockBuildTrainingNpcLionTeam.mockResolvedValue([
      buildTeamSlot("2", "lionden-training-npc", "Training Hall").lion
    ]);
    mockResolveAutoLionTeamBattle.mockReturnValue({
      firstTeam: [buildTeamSlot("1", "user_456", "Mira").lion],
      secondTeam: [
        buildTeamSlot("2", "lionden-training-npc", "Training Hall").lion
      ],
      participantLionIds: {
        first: ["1"],
        second: ["2"]
      },
      winnerSide: "first",
      loserSide: "second",
      rounds: [],
      finalHp: {
        "1": 12,
        "2": 0
      }
    });
    mockGetLionBattleMvpLionId.mockReturnValue("1");
    mockAwardBattleLionExperience.mockResolvedValue({
      outcome: "awarded",
      result: {
        lion: buildTeamSlot("1", "user_456", "Mira").lion,
        gainedExperience: 45,
        previousLevel: 5,
        nextLevel: 5,
        leveledUp: false
      }
    });
    mockRecordLionBattle.mockResolvedValue({
      id: "battle_123"
    });

    const message = buildMessage("~battle training");
    const handled = await handleLionCreatureMessage(message);

    expect(handled).toBe(true);
    expect(mockRecordTrainingBattleHousePointsSafely).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        userId: "user_456",
        battleRecordId: "battle_123"
      }
    );
    expect(message.reply).toHaveBeenCalledWith("battle summary");
  });
});

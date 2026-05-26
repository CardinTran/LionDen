import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HousePointLedgerRecord } from "../src/features/houses/house.service.js";

const mockLoggerWarn = vi.fn();

vi.mock("../src/lib/logger.js", () => ({
  logger: {
    warn: mockLoggerWarn,
    info: vi.fn(),
    error: vi.fn()
  }
}));

const {
  HOUSE_DUEL_COMPLETION_POINTS,
  HOUSE_LION_CATCH_POINTS,
  HOUSE_LION_TRAINING_POINTS,
  HOUSE_PRACTICE_ATTENDANCE_POINTS,
  HOUSE_RED_ENVELOPE_CLAIM_POINTS,
  HOUSE_TRAINING_BATTLE_POINTS,
  HOUSE_WEEKLY_CHALLENGE_POINTS,
  recordDuelCompletionHousePoints,
  recordDuelCompletionHousePointsSafely,
  recordLionCatchHousePoints,
  recordLionCatchHousePointsSafely,
  recordLionTrainingHousePoints,
  recordLionTrainingHousePointsSafely,
  recordPracticeAttendanceHousePoints,
  recordPracticeAttendanceHousePointsSafely,
  recordRedEnvelopeClaimHousePoints,
  recordRedEnvelopeClaimHousePointsSafely,
  recordTrainingBattleHousePoints,
  recordTrainingBattleHousePointsSafely,
  recordWeeklyChallengeHousePoints,
  recordWeeklyChallengeHousePointsSafely
} = await import("../src/features/houses/house-hooks.js");

const now = new Date("2026-05-26T12:00:00.000Z");

const house = {
  id: "house_123",
  guildId: "guild_123",
  houseKey: "red-house",
  name: "Red House",
  description: null,
  emoji: null,
  color: null,
  isActive: true,
  createdAt: now,
  updatedAt: now
};

const membership = {
  id: "membership_123",
  guildId: "guild_123",
  houseId: house.id,
  userId: "user_123",
  joinedAt: now,
  updatedAt: now
};

const createHookStore = () => {
  const ledgers: unknown[] = [];

  return {
    store: {
      house: {
        findUnique: vi.fn(async () => house),
        findMany: vi.fn(async () => [house]),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn()
      },
      houseMembership: {
        findUnique: vi.fn(
          async (): Promise<typeof membership | null> => membership
        ),
        findMany: vi.fn(async () => [membership]),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
      },
      housePointLedger: {
        findUnique: vi.fn(
          async (): Promise<HousePointLedgerRecord | null> => null
        ),
        findMany: vi.fn(async () => []),
        create: vi.fn(async ({ data }) => {
          const ledger = {
            id: `ledger_${ledgers.length + 1}`,
            createdAt: now,
            ...data
          };
          ledgers.push(ledger);
          return ledger;
        })
      }
    },
    ledgers
  };
};

describe("house hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("records practice attendance House points with a stable source", async () => {
    const { store } = createHookStore();

    const result = await recordPracticeAttendanceHousePoints(store, {
      guildId: "guild_123",
      userId: "user_123",
      practiceSessionId: "session_123"
    });

    expect(result.outcome).toBe("recorded");
    expect(store.housePointLedger.create).toHaveBeenCalledWith({
      data: {
        guildId: "guild_123",
        houseId: "house_123",
        userId: "user_123",
        sourceType: "PRACTICE_ATTENDANCE",
        sourceId: "session_123:user_123",
        points: HOUSE_PRACTICE_ATTENDANCE_POINTS,
        reason: "Practice attendance"
      }
    });
  });

  it("records weekly challenge House points with a stable source", async () => {
    const { store } = createHookStore();

    const result = await recordWeeklyChallengeHousePoints(store, {
      guildId: "guild_123",
      userId: "user_123",
      weekKey: "2026-W22",
      challengeKey: "practice-presence"
    });

    expect(result.outcome).toBe("recorded");
    expect(store.housePointLedger.create).toHaveBeenCalledWith({
      data: {
        guildId: "guild_123",
        houseId: "house_123",
        userId: "user_123",
        sourceType: "WEEKLY_CHALLENGE",
        sourceId: "2026-W22:practice-presence:user_123",
        points: HOUSE_WEEKLY_CHALLENGE_POINTS,
        reason: "Weekly challenge completed: practice-presence"
      }
    });
  });

  it("records red envelope claim House points with a stable source", async () => {
    const { store } = createHookStore();

    const result = await recordRedEnvelopeClaimHousePoints(store, {
      guildId: "guild_123",
      userId: "user_123",
      redEnvelopeId: "envelope_123"
    });

    expect(result.outcome).toBe("recorded");
    expect(store.housePointLedger.create).toHaveBeenCalledWith({
      data: {
        guildId: "guild_123",
        houseId: "house_123",
        userId: "user_123",
        sourceType: "RED_ENVELOPE_CLAIM",
        sourceId: "red_envelope:envelope_123:user_123",
        points: HOUSE_RED_ENVELOPE_CLAIM_POINTS,
        reason: "Red envelope claim"
      }
    });
  });

  it("records lion catch House points with the supplied stable source", async () => {
    const { store } = createHookStore();

    const result = await recordLionCatchHousePoints(store, {
      guildId: "guild_123",
      userId: "user_123",
      sourceId: "lion_catch:spawn_123:user_123"
    });

    expect(result.outcome).toBe("recorded");
    expect(store.housePointLedger.create).toHaveBeenCalledWith({
      data: {
        guildId: "guild_123",
        houseId: "house_123",
        userId: "user_123",
        sourceType: "LION_CATCH",
        sourceId: "lion_catch:spawn_123:user_123",
        points: HOUSE_LION_CATCH_POINTS,
        reason: "Wild lion catch"
      }
    });
  });

  it("records lion training House points with the supplied stable source", async () => {
    const { store } = createHookStore();

    const result = await recordLionTrainingHousePoints(store, {
      guildId: "guild_123",
      userId: "user_123",
      sourceId: "lion_training:lion_123:2026-05-26T12:00:00.000Z:user_123"
    });

    expect(result.outcome).toBe("recorded");
    expect(store.housePointLedger.create).toHaveBeenCalledWith({
      data: {
        guildId: "guild_123",
        houseId: "house_123",
        userId: "user_123",
        sourceType: "LION_TRAINING",
        sourceId: "lion_training:lion_123:2026-05-26T12:00:00.000Z:user_123",
        points: HOUSE_LION_TRAINING_POINTS,
        reason: "Lion training"
      }
    });
  });

  it("records Training Hall battle House points with a battle record source", async () => {
    const { store } = createHookStore();

    const result = await recordTrainingBattleHousePoints(store, {
      guildId: "guild_123",
      userId: "user_123",
      battleRecordId: "battle_123"
    });

    expect(result.outcome).toBe("recorded");
    expect(store.housePointLedger.create).toHaveBeenCalledWith({
      data: {
        guildId: "guild_123",
        houseId: "house_123",
        userId: "user_123",
        sourceType: "TRAINING_BATTLE",
        sourceId: "training_battle:battle_123:user_123",
        points: HOUSE_TRAINING_BATTLE_POINTS,
        reason: "Training Hall battle"
      }
    });
  });

  it("records duel completion House points with a duel session source", async () => {
    const { store } = createHookStore();

    const result = await recordDuelCompletionHousePoints(store, {
      guildId: "guild_123",
      userId: "user_123",
      duelId: "duel_123"
    });

    expect(result.outcome).toBe("recorded");
    expect(store.housePointLedger.create).toHaveBeenCalledWith({
      data: {
        guildId: "guild_123",
        houseId: "house_123",
        userId: "user_123",
        sourceType: "DUEL_COMPLETION",
        sourceId: "duel:duel_123:user_123",
        points: HOUSE_DUEL_COMPLETION_POINTS,
        reason: "Interactive duel completion"
      }
    });
  });

  it("skips duplicate hook source IDs", async () => {
    const { store, ledgers } = createHookStore();
    store.housePointLedger.findUnique.mockResolvedValue({
      id: "ledger_existing",
      guildId: "guild_123",
      houseId: "house_123",
      userId: "user_123",
      sourceType: "LION_CATCH",
      sourceId: "lion_catch:spawn_123:user_123",
      points: HOUSE_LION_CATCH_POINTS,
      reason: "Wild lion catch",
      createdAt: now
    });

    const result = await recordLionCatchHousePoints(store, {
      guildId: "guild_123",
      userId: "user_123",
      sourceId: "lion_catch:spawn_123:user_123"
    });

    expect(result.outcome).toBe("duplicate_source");
    expect(ledgers).toHaveLength(0);
    expect(store.housePointLedger.create).not.toHaveBeenCalled();
  });

  it("is a no-op when the user has no House membership", async () => {
    const { store, ledgers } = createHookStore();
    store.houseMembership.findUnique.mockResolvedValue(null);

    await recordPracticeAttendanceHousePointsSafely(store, {
      guildId: "guild_123",
      userId: "user_123",
      practiceSessionId: "session_123"
    });

    expect(ledgers).toHaveLength(0);
    expect(mockLoggerWarn).not.toHaveBeenCalled();
  });

  it("logs and swallows practice hook failures", async () => {
    const { store } = createHookStore();
    const error = new Error("ledger unavailable");
    store.houseMembership.findUnique.mockRejectedValue(error);

    await expect(
      recordPracticeAttendanceHousePointsSafely(store, {
        guildId: "guild_123",
        userId: "user_123",
        practiceSessionId: "session_123"
      })
    ).resolves.toBeUndefined();

    expect(mockLoggerWarn).toHaveBeenCalledWith(
      "House practice attendance point recording failed",
      {
        guildId: "guild_123",
        userId: "user_123",
        sourceType: "PRACTICE_ATTENDANCE",
        sourceId: "session_123:user_123",
        points: HOUSE_PRACTICE_ATTENDANCE_POINTS,
        error
      }
    );
  });

  it("logs and swallows weekly hook failures", async () => {
    const { store } = createHookStore();
    const error = new Error("ledger unavailable");
    store.houseMembership.findUnique.mockRejectedValue(error);

    await expect(
      recordWeeklyChallengeHousePointsSafely(store, {
        guildId: "guild_123",
        userId: "user_123",
        weekKey: "2026-W22",
        challengeKey: "practice-presence"
      })
    ).resolves.toBeUndefined();

    expect(mockLoggerWarn).toHaveBeenCalledWith(
      "House weekly challenge point recording failed",
      {
        guildId: "guild_123",
        userId: "user_123",
        sourceType: "WEEKLY_CHALLENGE",
        sourceId: "2026-W22:practice-presence:user_123",
        points: HOUSE_WEEKLY_CHALLENGE_POINTS,
        error
      }
    );
  });

  it("logs and swallows new hook failures", async () => {
    const { store } = createHookStore();
    const error = new Error("ledger unavailable");
    store.houseMembership.findUnique.mockRejectedValue(error);

    await expect(
      recordRedEnvelopeClaimHousePointsSafely(store, {
        guildId: "guild_123",
        userId: "user_123",
        redEnvelopeId: "envelope_123"
      })
    ).resolves.toBeUndefined();
    await expect(
      recordLionCatchHousePointsSafely(store, {
        guildId: "guild_123",
        userId: "user_123",
        sourceId: "lion_catch:spawn_123:user_123"
      })
    ).resolves.toBeUndefined();
    await expect(
      recordLionTrainingHousePointsSafely(store, {
        guildId: "guild_123",
        userId: "user_123",
        sourceId: "lion_training:lion_123:2026-05-26T12:00:00.000Z:user_123"
      })
    ).resolves.toBeUndefined();
    await expect(
      recordTrainingBattleHousePointsSafely(store, {
        guildId: "guild_123",
        userId: "user_123",
        battleRecordId: "battle_123"
      })
    ).resolves.toBeUndefined();
    await expect(
      recordDuelCompletionHousePointsSafely(store, {
        guildId: "guild_123",
        userId: "user_123",
        duelId: "duel_123"
      })
    ).resolves.toBeUndefined();

    expect(mockLoggerWarn).toHaveBeenCalledWith(
      "House red envelope claim point recording failed",
      expect.objectContaining({
        guildId: "guild_123",
        userId: "user_123",
        sourceType: "RED_ENVELOPE_CLAIM",
        sourceId: "red_envelope:envelope_123:user_123",
        points: HOUSE_RED_ENVELOPE_CLAIM_POINTS,
        error
      })
    );
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      "House lion catch point recording failed",
      expect.objectContaining({
        sourceType: "LION_CATCH",
        sourceId: "lion_catch:spawn_123:user_123",
        points: HOUSE_LION_CATCH_POINTS,
        error
      })
    );
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      "House lion training point recording failed",
      expect.objectContaining({
        sourceType: "LION_TRAINING",
        sourceId: "lion_training:lion_123:2026-05-26T12:00:00.000Z:user_123",
        points: HOUSE_LION_TRAINING_POINTS,
        error
      })
    );
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      "House Training Hall battle point recording failed",
      expect.objectContaining({
        sourceType: "TRAINING_BATTLE",
        sourceId: "training_battle:battle_123:user_123",
        points: HOUSE_TRAINING_BATTLE_POINTS,
        error
      })
    );
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      "House duel completion point recording failed",
      expect.objectContaining({
        sourceType: "DUEL_COMPLETION",
        sourceId: "duel:duel_123:user_123",
        points: HOUSE_DUEL_COMPLETION_POINTS,
        error
      })
    );
  });
});

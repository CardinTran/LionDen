import { beforeEach, describe, expect, it, vi } from "vitest";

const mockLoggerWarn = vi.fn();

vi.mock("../src/lib/logger.js", () => ({
  logger: {
    warn: mockLoggerWarn,
    info: vi.fn(),
    error: vi.fn()
  }
}));

const {
  HOUSE_PRACTICE_ATTENDANCE_POINTS,
  HOUSE_WEEKLY_CHALLENGE_POINTS,
  recordPracticeAttendanceHousePoints,
  recordPracticeAttendanceHousePointsSafely,
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
        findUnique: vi.fn(async () => null),
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
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRecordWeeklyChallengeProgress = vi.fn();
const mockLoggerWarn = vi.fn();

vi.mock("../src/features/challenges/weekly-challenge.service.js", () => ({
  recordWeeklyChallengeProgress: mockRecordWeeklyChallengeProgress
}));

vi.mock("../src/lib/logger.js", () => ({
  logger: {
    warn: mockLoggerWarn
  }
}));

const { recordWeeklyChallengeProgressSafely } =
  await import("../src/features/challenges/weekly-challenge-hooks.js");

const occurredAt = new Date("2026-05-25T12:00:00.000Z");

const input = {
  guildId: "guild_123",
  userId: "user_123",
  displayName: "Mira",
  activityType: "LION_TRAIN" as const,
  occurredAt
};

describe("weekly challenge hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRecordWeeklyChallengeProgress.mockResolvedValue([]);
  });

  it("delegates successful progress recording", async () => {
    await recordWeeklyChallengeProgressSafely({} as never, input);

    expect(mockRecordWeeklyChallengeProgress).toHaveBeenCalledWith(
      {} as never,
      input
    );
    expect(mockLoggerWarn).not.toHaveBeenCalled();
  });

  it("logs and swallows progress recording failures", async () => {
    const error = new Error("challenge store unavailable");
    mockRecordWeeklyChallengeProgress.mockRejectedValue(error);

    await expect(
      recordWeeklyChallengeProgressSafely({} as never, input)
    ).resolves.toBeUndefined();

    expect(mockLoggerWarn).toHaveBeenCalledWith(
      "Weekly challenge progress recording failed",
      {
        guildId: "guild_123",
        userId: "user_123",
        activityType: "LION_TRAIN",
        error
      }
    );
  });
});

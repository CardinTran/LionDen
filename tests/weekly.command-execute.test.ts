import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetUserBadgeView = vi.fn();
const mockGetUserWeeklyChallengeView = vi.fn();

vi.mock("../src/features/challenges/weekly-challenge.service.js", async () => {
  const actual = await vi.importActual<
    typeof import("../src/features/challenges/weekly-challenge.service.js")
  >("../src/features/challenges/weekly-challenge.service.js");

  return {
    ...actual,
    getUserBadgeView: mockGetUserBadgeView,
    getUserWeeklyChallengeView: mockGetUserWeeklyChallengeView
  };
});

vi.mock("../src/lib/prisma.js", () => ({
  prisma: {}
}));

const { weeklyCommand } = await import("../src/bot/commands/weekly.js");

const createInteraction = (subcommand: "challenges" | "badges") => ({
  guildId: "guild_123",
  user: {
    id: "user_123",
    username: "Mira"
  },
  member: {
    user: {
      username: "Mira"
    }
  },
  options: {
    getSubcommand: vi.fn(() => subcommand)
  },
  reply: vi.fn()
});

describe("weekly command execution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserBadgeView.mockResolvedValue([]);
    mockGetUserWeeklyChallengeView.mockResolvedValue({
      weekKey: "2026-W22",
      challenges: []
    });
  });

  it("replies ephemerally with challenge progress", async () => {
    const interaction = createInteraction("challenges");

    await weeklyCommand.execute(interaction as never);

    expect(mockGetUserWeeklyChallengeView).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        userId: "user_123",
        now: expect.any(Date)
      }
    );
    expect(interaction.reply).toHaveBeenCalledWith({
      content: "No weekly challenges are enabled right now.",
      ephemeral: true
    });
  });

  it("replies ephemerally with earned badges", async () => {
    const interaction = createInteraction("badges");

    await weeklyCommand.execute(interaction as never);

    expect(mockGetUserBadgeView).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        userId: "user_123"
      }
    );
    expect(interaction.reply).toHaveBeenCalledWith({
      content: "Mira has not earned any LionDen badges yet.",
      ephemeral: true
    });
  });

  it("keeps weekly commands server-only", async () => {
    const interaction = {
      ...createInteraction("challenges"),
      guildId: null
    };

    await weeklyCommand.execute(interaction as never);

    expect(mockGetUserWeeklyChallengeView).not.toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalledWith({
      content: "This command can only be used inside a server.",
      ephemeral: true
    });
  });
});

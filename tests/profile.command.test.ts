import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetOrCreateProfile = vi.fn();
const mockGetFavoriteLionForProfile = vi.fn();

vi.mock("../src/lib/prisma.js", () => ({
  prisma: {}
}));

vi.mock("../src/features/profiles/profile.service.js", () => ({
  getOrCreateProfile: mockGetOrCreateProfile
}));

vi.mock("../src/features/lions/lion-showcase.service.js", () => ({
  getFavoriteLionForProfile: mockGetFavoriteLionForProfile
}));

const { profileCommand, profileCommandJson } = await import(
  "../src/bot/commands/profile.js"
);

const now = new Date("2026-05-27T12:00:00.000Z");

describe("profile command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOrCreateProfile.mockResolvedValue({
      id: "profile_123",
      guildId: "guild_123",
      userId: "user_123",
      displayName: "Mira",
      xp: 125,
      level: 2,
      coins: 50,
      lastMessageXpAt: null,
      lastDailyClaimAt: null,
      createdAt: now,
      updatedAt: now
    });
    mockGetFavoriteLionForProfile.mockResolvedValue(null);
  });

  it("exports the expected slash command metadata", () => {
    expect(profileCommandJson.name).toBe("profile");
    expect(profileCommandJson.description).toBe(
      "View your LionDen progression profile."
    );
  });

  it("includes the caller's favorite lion when one is set", async () => {
    mockGetFavoriteLionForProfile.mockResolvedValue({
      lion: {
        id: "lion_123",
        guildId: "guild_123",
        userId: "user_123",
        ownerDisplayName: "Mira",
        lionSpeciesId: "species_123",
        nickname: "Thunder",
        level: 7,
        experience: 0,
        sourceType: "WILD_CATCH",
        sourceReferenceId: null,
        lastTrainedAt: null,
        lastBattledAt: null,
        acquiredAt: now,
        createdAt: now,
        updatedAt: now,
        species: {
          id: "species_123",
          publicId: "L001",
          slug: "southern-lion",
          name: "Southern Lion",
          imagePath: "assets/lions/cards/southern-lion.jpg",
          rarity: "RARE",
          baseCatchRate: 60,
          baseValue: 5,
          spawnWeight: 10,
          primaryType: "FIRE",
          secondaryType: null,
          baseHp: 50,
          baseAttack: 12,
          baseDefense: 9,
          baseSpeed: 10,
          abilityKey: "steady-heart",
          abilityName: "Steady Heart",
          abilityDescription: "No special battle effect yet.",
          description: "A bright lion.",
          isEnabled: true,
          createdAt: now,
          updatedAt: now
        }
      }
    });
    const interaction = {
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
      reply: vi.fn()
    };

    await profileCommand.execute(interaction as never);

    expect(mockGetOrCreateProfile).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        userId: "user_123",
        displayName: "Mira"
      }
    );
    expect(mockGetFavoriteLionForProfile).toHaveBeenCalledWith(
      {},
      {
        guildId: "guild_123",
        userId: "user_123"
      }
    );
    expect(interaction.reply).toHaveBeenCalledWith({
      content: expect.stringContaining(
        "Favorite Lion: Thunder (Southern Lion) - RARE Southern Lion, Lv. 7"
      ),
      ephemeral: true
    });
  });
});

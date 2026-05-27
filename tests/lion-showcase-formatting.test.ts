import { describe, expect, it } from "vitest";

import type {
  LionSpeciesRecord,
  UserLionWithSpeciesRecord
} from "../src/features/lions/lion-creature.service.js";
import {
  formatFavoriteLionSummary,
  formatLionShowcaseMessage,
  formatShowcaseOwnedLionMessage
} from "../src/features/lions/lion-formatting.js";

const now = new Date("2026-05-27T12:00:00.000Z");

const buildSpecies = (
  overrides: Partial<LionSpeciesRecord> = {}
): LionSpeciesRecord => ({
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
  secondaryType: "WATER",
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
  updatedAt: now,
  ...overrides
});

const buildLion = (
  overrides: Partial<UserLionWithSpeciesRecord> = {}
): UserLionWithSpeciesRecord => ({
  id: "lion_12345678",
  guildId: "guild_123",
  userId: "user_123",
  ownerDisplayName: "Mira",
  lionSpeciesId: "species_123",
  nickname: "Thunder",
  level: 7,
  experience: 240,
  sourceType: "WILD_CATCH",
  sourceReferenceId: "spawn_123",
  lastTrainedAt: null,
  lastBattledAt: null,
  acquiredAt: now,
  createdAt: now,
  updatedAt: now,
  species: buildSpecies(),
  ...overrides
});

describe("lion showcase formatting", () => {
  it("formats a public showcase with owner, favorite, stats, and team context", () => {
    const message = formatLionShowcaseMessage({
      lion: buildLion(),
      ownerUserId: "user_123",
      ownerDisplayName: "Mira",
      isFavorite: true,
      teamSlot: 1
    });

    expect(message).toContain("Lion Showcase");
    expect(message).toContain("Owner: <@user_123> (Mira)");
    expect(message).toContain("Favorite Lion: yes");
    expect(message).toContain("Name: Thunder (Southern Lion)");
    expect(message).toContain("Rarity: RARE");
    expect(message).toContain("Level: 7");
    expect(message).toContain("Stats:");
    expect(message).toContain("Team: Slot 1");
    expect(message).toContain("Lion ID: `#lion_123`");
  });

  it("formats favorite summaries and empty showcase guidance", () => {
    expect(formatFavoriteLionSummary(buildLion())).toBe(
      "Favorite Lion: Thunder (Southern Lion) - RARE Southern Lion, Lv. 7"
    );
    expect(formatFavoriteLionSummary(null)).toBeNull();
    expect(
      formatShowcaseOwnedLionMessage({
        outcome: "no_favorite",
        showcase: null,
        failedQuery: null
      })
    ).toBe(
      "Use `~showcase <lion>` to show one of your lions, or set a favorite first with `~favorite <lion>`."
    );
  });
});

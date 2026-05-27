import { describe, expect, it } from "vitest";

import type {
  LionSpeciesRecord,
  UserLionWithSpeciesRecord
} from "../src/features/lions/lion-creature.service.js";
import {
  formatLionBondCompactSummary,
  formatLionBondCooldown,
  formatLionBondStatusMessage,
  formatLionCareResultMessage
} from "../src/features/lions/lion-bond-formatting.js";
import { getLionBond } from "../src/features/lions/lion-bond.service.js";

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
  updatedAt: now,
  ...overrides
});

const buildLion = (
  overrides: Partial<UserLionWithSpeciesRecord> = {}
): UserLionWithSpeciesRecord => ({
  id: "lion_123",
  guildId: "guild_123",
  userId: "user_123",
  ownerDisplayName: "Mira",
  lionSpeciesId: "species_123",
  nickname: "Thunder",
  level: 7,
  experience: 240,
  bondXp: 80,
  bondLevel: 3,
  sourceType: "WILD_CATCH",
  sourceReferenceId: "spawn_123",
  lastTrainedAt: null,
  lastBattledAt: null,
  lastFedAt: null,
  lastGroomedAt: null,
  lastBondedAt: null,
  acquiredAt: now,
  createdAt: now,
  updatedAt: now,
  species: buildSpecies(),
  ...overrides
});

describe("lion bond formatting", () => {
  it("formats cooldowns compactly", () => {
    expect(formatLionBondCooldown(null, now)).toBe("ready");
    expect(formatLionBondCooldown(new Date(now.getTime() + 42 * 60_000), now)).toBe(
      "42m"
    );
    expect(
      formatLionBondCooldown(new Date(now.getTime() + 5 * 60 * 60_000), now)
    ).toBe("5h");
    expect(
      formatLionBondCooldown(
        new Date(now.getTime() + (5 * 60 + 12) * 60_000),
        now
      )
    ).toBe("5h 12m");
  });

  it("formats status with level, progress, mood, and care readiness", () => {
    const result = {
      outcome: "status" as const,
      status: getLionBond(
        buildLion({
          lastFedAt: new Date(now.getTime() - 60 * 60_000)
        })
      ),
      failedQuery: null
    };
    const message = formatLionBondStatusMessage(result, now);

    expect(message).toContain("Thunder (Southern Lion) - Bond Level 3");
    expect(message).toContain("Progress: 80 / 150 XP");
    expect(message).toContain("Mood: Proud");
    expect(message).toContain("- Feed: 5h");
    expect(message).toContain("- Groom: ready");
  });

  it("formats care success with XP, progress, mood, and level-up messaging", () => {
    const message = formatLionCareResultMessage(
      {
        outcome: "cared",
        action: "feed",
        status: getLionBond(
          buildLion({
            bondXp: 25,
            bondLevel: 2
          })
        ),
        gainedBondXp: 5,
        previousLevel: 1,
        nextLevel: 2,
        leveledUp: true,
        cooldownEndsAt: null,
        failedQuery: null
      },
      now
    );

    expect(message).toContain("Thunder (Southern Lion) enjoyed the meal.");
    expect(message).toContain("Bond +5 XP.");
    expect(message).toContain("Bond Level Up: 1 -> 2");
    expect(message).toContain("Progress: 25 / 75 XP");
    expect(message).toContain("Mood: Comfortable");
  });

  it("formats cooldown and no-favorite guidance without reward language", () => {
    expect(
      formatLionCareResultMessage(
        {
          outcome: "on_cooldown",
          action: "groom",
          status: getLionBond(buildLion()),
          gainedBondXp: 0,
          previousLevel: 3,
          nextLevel: 3,
          leveledUp: false,
          cooldownEndsAt: new Date(now.getTime() + 2 * 60 * 60_000),
          failedQuery: null
        },
        now
      )
    ).toContain("was already groomed recently. Try again in 2h.");

    expect(
      formatLionBondStatusMessage(
        {
          outcome: "no_favorite",
          status: null,
          failedQuery: null
        },
        now
      )
    ).toBe("Use `~bond <lion>` or set a favorite first with `~favorite <lion>`.");
  });

  it("formats compact bond summaries for profile, detail, and showcase display", () => {
    expect(formatLionBondCompactSummary(buildLion())).toBe(
      "Bond: Level 3 - Proud"
    );
  });
});

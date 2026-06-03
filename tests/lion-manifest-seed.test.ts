import { describe, expect, it } from "vitest";

import { getLionImageUrl } from "../src/features/lions/lion-image-url.js";
import { DEFAULT_LION_SPECIES } from "../src/features/lions/lion-seed-data.js";
import type {
  LionElementValue,
  LionRarityValue
} from "../src/features/lions/lion-seed-data.js";

const validRarities = new Set<LionRarityValue>([
  "COMMON",
  "UNCOMMON",
  "RARE",
  "EPIC",
  "LEGENDARY"
]);
const validTypes = new Set<LionElementValue>([
  "NEUTRAL",
  "FIRE",
  "WATER",
  "EARTH",
  "WIND",
  "LIGHT",
  "SHADOW",
  "METAL",
  "NATURE"
]);

const countBy = <T>(values: T[]): Map<T, number> => {
  const counts = new Map<T, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return counts;
};

describe("manifest lion species seed data", () => {
  it("loads the full manifest species catalog", () => {
    expect(DEFAULT_LION_SPECIES).toHaveLength(766);
  });

  it("keeps manifest identity fields unique", () => {
    expect(
      new Set(DEFAULT_LION_SPECIES.map((entry) => entry.publicId)).size
    ).toBe(766);
    expect(new Set(DEFAULT_LION_SPECIES.map((entry) => entry.slug)).size).toBe(
      766
    );
    expect(new Set(DEFAULT_LION_SPECIES.map((entry) => entry.name)).size).toBe(
      766
    );
    expect(
      new Set(DEFAULT_LION_SPECIES.map((entry) => entry.imagePath)).size
    ).toBe(766);
  });

  it("uses R2 object-key image paths from the manifest", () => {
    for (const species of DEFAULT_LION_SPECIES) {
      expect(species.imagePath).toBe(
        `lions/${species.rarity.toLowerCase()}/${species.slug}.jpg`
      );
      expect(species.imagePath).not.toContain("assets/lions/cards/");
    }
  });

  it("uses valid rarities and types with optional secondary types", () => {
    let dualTypeCount = 0;

    for (const species of DEFAULT_LION_SPECIES) {
      expect(validRarities.has(species.rarity)).toBe(true);
      expect(validTypes.has(species.primaryType)).toBe(true);

      if (species.secondaryType) {
        dualTypeCount += 1;
        expect(validTypes.has(species.secondaryType)).toBe(true);
        expect(species.secondaryType).not.toBe(species.primaryType);
      }
    }

    expect(dualTypeCount).toBeGreaterThan(0);
    expect(dualTypeCount).toBeLessThan(DEFAULT_LION_SPECIES.length);
  });

  it("keeps the manifest primary type distribution balanced", () => {
    const counts = [
      ...countBy(
        DEFAULT_LION_SPECIES.map((entry) => entry.primaryType)
      ).values()
    ];

    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });

  it("keeps generated gameplay values inside fair ranges", () => {
    for (const species of DEFAULT_LION_SPECIES) {
      expect(species.baseCatchRate).toBeGreaterThanOrEqual(20);
      expect(species.baseCatchRate).toBeLessThanOrEqual(70);
      expect(species.spawnWeight).toBeGreaterThanOrEqual(3);
      expect(species.spawnWeight).toBeLessThanOrEqual(100);
      expect(species.baseHp).toBeGreaterThanOrEqual(45);
      expect(species.baseHp).toBeLessThanOrEqual(80);
      expect(species.baseAttack).toBeGreaterThanOrEqual(9);
      expect(species.baseAttack).toBeLessThanOrEqual(22);
      expect(species.baseDefense).toBeGreaterThanOrEqual(8);
      expect(species.baseDefense).toBeLessThanOrEqual(22);
      expect(species.baseSpeed).toBeGreaterThanOrEqual(7);
      expect(species.baseSpeed).toBeLessThanOrEqual(22);
    }
  });

  it("builds R2 image URLs from manifest object keys", () => {
    expect(
      getLionImageUrl("lions/common/example.jpg", "https://example.com")
    ).toBe("https://example.com/lions/common/example.jpg");
  });
});

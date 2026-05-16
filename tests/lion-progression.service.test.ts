import { describe, expect, it } from "vitest";

import {
  addLionExperience,
  deriveLionStats,
  getLionExperienceProgress,
  getLionLevelFromExperience,
  getTotalLionXpForLevel
} from "../src/features/lions/lion-progression.service.js";

describe("lion progression service", () => {
  it("uses a scalable level XP curve", () => {
    expect(getTotalLionXpForLevel(1)).toBe(0);
    expect(getTotalLionXpForLevel(2)).toBe(70);
    expect(getTotalLionXpForLevel(3)).toBe(180);
    expect(getTotalLionXpForLevel(10)).toBe(2070);
  });

  it("derives level from total lion experience", () => {
    expect(getLionLevelFromExperience(0)).toBe(1);
    expect(getLionLevelFromExperience(69)).toBe(1);
    expect(getLionLevelFromExperience(70)).toBe(2);
    expect(getLionLevelFromExperience(180)).toBe(3);
  });

  it("reports progress toward the next level", () => {
    expect(getLionExperienceProgress(100)).toMatchObject({
      level: 2,
      currentLevelXp: 70,
      nextLevelXp: 180,
      xpIntoLevel: 30,
      xpNeededForNextLevel: 80
    });
  });

  it("scales derived battle stats from base stats and level", () => {
    expect(
      deriveLionStats(
        {
          baseHp: 50,
          baseAttack: 10,
          baseDefense: 8,
          baseSpeed: 12
        },
        5
      )
    ).toEqual({
      hp: 66,
      attack: 16,
      defense: 13,
      speed: 16
    });
  });

  it("adds experience and returns the resulting level state", () => {
    expect(
      addLionExperience({
        currentExperience: 60,
        gainedExperience: 20
      })
    ).toMatchObject({
      experience: 80,
      level: 2
    });
  });
});

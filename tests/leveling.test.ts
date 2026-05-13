import { describe, expect, it } from "vitest";

import {
  getLevelFromXp,
  getLevelProgressFromXp,
  getTotalXpForLevel
} from "../src/features/progression/leveling.js";

describe("leveling", () => {
  it("uses the intended early LionDen level thresholds", () => {
    expect(getTotalXpForLevel(1)).toBe(0);
    expect(getTotalXpForLevel(2)).toBe(100);
    expect(getTotalXpForLevel(3)).toBe(225);
    expect(getTotalXpForLevel(4)).toBe(375);
    expect(getTotalXpForLevel(5)).toBe(550);
    expect(getTotalXpForLevel(10)).toBe(1800);
  });

  it("maps total xp to the correct level", () => {
    expect(getLevelFromXp(0)).toBe(1);
    expect(getLevelFromXp(99)).toBe(1);
    expect(getLevelFromXp(100)).toBe(2);
    expect(getLevelFromXp(224)).toBe(2);
    expect(getLevelFromXp(225)).toBe(3);
  });

  it("returns progress within the current level band", () => {
    expect(getLevelProgressFromXp(140)).toEqual({
      currentLevel: 2,
      currentLevelXpFloor: 100,
      nextLevel: 3,
      nextLevelXpTarget: 225,
      xpIntoLevel: 40,
      xpNeededForNextLevel: 85,
      xpSpanThisLevel: 125
    });
  });
});

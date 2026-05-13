export interface LevelProgress {
  currentLevel: number;
  currentLevelXpFloor: number;
  nextLevel: number;
  nextLevelXpTarget: number;
  xpIntoLevel: number;
  xpNeededForNextLevel: number;
  xpSpanThisLevel: number;
}

export const getTotalXpForLevel = (level: number): number => {
  if (!Number.isInteger(level) || level < 1) {
    throw new Error("level must be an integer greater than or equal to 1");
  }

  if (level === 1) {
    return 0;
  }

  return ((level - 1) * (25 * level + 150)) / 2;
};

export const getLevelFromXp = (xp: number): number => {
  if (!Number.isInteger(xp) || xp < 0) {
    throw new Error("xp must be an integer greater than or equal to 0");
  }

  let level = 1;

  while (getTotalXpForLevel(level + 1) <= xp) {
    level += 1;
  }

  return level;
};

export const getLevelProgressFromXp = (xp: number): LevelProgress => {
  const currentLevel = getLevelFromXp(xp);
  const currentLevelXpFloor = getTotalXpForLevel(currentLevel);
  const nextLevel = currentLevel + 1;
  const nextLevelXpTarget = getTotalXpForLevel(nextLevel);

  return {
    currentLevel,
    currentLevelXpFloor,
    nextLevel,
    nextLevelXpTarget,
    xpIntoLevel: xp - currentLevelXpFloor,
    xpNeededForNextLevel: nextLevelXpTarget - xp,
    xpSpanThisLevel: nextLevelXpTarget - currentLevelXpFloor
  };
};

export interface LionBaseStats {
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
  baseSpeed: number;
}

export interface LionDerivedStats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface LionExperienceProgress {
  level: number;
  experience: number;
  currentLevelXp: number;
  nextLevelXp: number;
  xpIntoLevel: number;
  xpNeededForNextLevel: number;
}

export const MIN_LION_LEVEL = 1;
export const MAX_LION_LEVEL = 100;

export const clampLionLevel = (level: number): number =>
  Math.min(MAX_LION_LEVEL, Math.max(MIN_LION_LEVEL, Math.floor(level)));

export const getTotalLionXpForLevel = (level: number): number => {
  const safeLevel = clampLionLevel(level);
  const completedLevels = safeLevel - 1;

  return Math.floor((completedLevels * (40 * safeLevel + 60)) / 2);
};

export const getLionLevelFromExperience = (experience: number): number => {
  const safeExperience = Math.max(0, Math.floor(experience));
  let level = MIN_LION_LEVEL;

  while (
    level < MAX_LION_LEVEL &&
    getTotalLionXpForLevel(level + 1) <= safeExperience
  ) {
    level += 1;
  }

  return level;
};

export const getLionExperienceProgress = (
  experience: number
): LionExperienceProgress => {
  const safeExperience = Math.max(0, Math.floor(experience));
  const level = getLionLevelFromExperience(safeExperience);
  const currentLevelXp = getTotalLionXpForLevel(level);
  const nextLevelXp = getTotalLionXpForLevel(
    Math.min(MAX_LION_LEVEL, level + 1)
  );

  return {
    level,
    experience: safeExperience,
    currentLevelXp,
    nextLevelXp,
    xpIntoLevel: safeExperience - currentLevelXp,
    xpNeededForNextLevel:
      level >= MAX_LION_LEVEL ? 0 : Math.max(0, nextLevelXp - safeExperience)
  };
};

export const deriveLionStats = (
  baseStats: LionBaseStats,
  level: number
): LionDerivedStats => {
  const safeLevel = clampLionLevel(level);
  const levelBonus = safeLevel - 1;

  return {
    hp: Math.max(1, baseStats.baseHp + levelBonus * 4),
    attack: Math.max(1, baseStats.baseAttack + Math.floor(levelBonus * 1.5)),
    defense: Math.max(1, baseStats.baseDefense + Math.floor(levelBonus * 1.3)),
    speed: Math.max(1, baseStats.baseSpeed + Math.floor(levelBonus * 1.1))
  };
};

export const addLionExperience = (input: {
  currentExperience: number;
  gainedExperience: number;
}): LionExperienceProgress => {
  const nextExperience =
    Math.max(0, Math.floor(input.currentExperience)) +
    Math.max(0, Math.floor(input.gainedExperience));

  return getLionExperienceProgress(nextExperience);
};

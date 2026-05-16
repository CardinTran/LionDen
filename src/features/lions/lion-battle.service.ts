import type { LionElementValue } from "./lion-seed-data.js";
import type { LionDerivedStats } from "./lion-progression.service.js";

export interface LionBattleMove {
  key: string;
  name: string;
  type: LionElementValue;
  power: number;
  accuracy: number;
}

export interface LionBattleParticipant {
  id: string;
  level: number;
  primaryType: LionElementValue;
  secondaryType: LionElementValue | null;
  stats: LionDerivedStats;
}

export interface LionDamageInput {
  attacker: LionBattleParticipant;
  defender: LionBattleParticipant;
  move: Pick<LionBattleMove, "type" | "power">;
  randomModifier?: number;
}

export const DEFAULT_LION_MOVE: LionBattleMove = {
  key: "pounce",
  name: "Pounce",
  type: "NEUTRAL",
  power: 40,
  accuracy: 100
};

const TYPE_EFFECTIVENESS: Partial<
  Record<LionElementValue, Partial<Record<LionElementValue, number>>>
> = {
  EARTH: {
    FIRE: 2,
    METAL: 2,
    WATER: 0.5,
    WIND: 0.5,
    NATURE: 0.5
  },
  FIRE: {
    NATURE: 2,
    METAL: 2,
    WATER: 0.5,
    EARTH: 0.5
  },
  LIGHT: {
    SHADOW: 2
  },
  METAL: {
    WIND: 2,
    LIGHT: 1.5,
    FIRE: 0.5,
    EARTH: 0.5
  },
  NATURE: {
    WATER: 2,
    EARTH: 2,
    FIRE: 0.5,
    METAL: 0.5
  },
  SHADOW: {
    LIGHT: 2
  },
  WATER: {
    FIRE: 2,
    EARTH: 2,
    NATURE: 0.5
  },
  WIND: {
    EARTH: 2,
    METAL: 0.5
  }
};

export const getSingleTypeEffectiveness = (input: {
  attackType: LionElementValue;
  defenderType: LionElementValue;
}): number => TYPE_EFFECTIVENESS[input.attackType]?.[input.defenderType] ?? 1;

export const getTypeEffectiveness = (input: {
  attackType: LionElementValue;
  defenderPrimaryType: LionElementValue;
  defenderSecondaryType?: LionElementValue | null;
}): number => {
  const primaryEffectiveness = getSingleTypeEffectiveness({
    attackType: input.attackType,
    defenderType: input.defenderPrimaryType
  });

  if (
    !input.defenderSecondaryType ||
    input.defenderSecondaryType === input.defenderPrimaryType
  ) {
    return primaryEffectiveness;
  }

  return (
    primaryEffectiveness *
    getSingleTypeEffectiveness({
      attackType: input.attackType,
      defenderType: input.defenderSecondaryType
    })
  );
};

export const calculateLionMoveDamage = (input: LionDamageInput): number => {
  const movePower = Math.max(1, Math.floor(input.move.power));
  const level = Math.max(1, Math.floor(input.attacker.level));
  const attack = Math.max(1, input.attacker.stats.attack);
  const defense = Math.max(1, input.defender.stats.defense);
  const randomModifier = Math.min(1, Math.max(0.85, input.randomModifier ?? 1));
  const typeEffectiveness = getTypeEffectiveness({
    attackType: input.move.type,
    defenderPrimaryType: input.defender.primaryType,
    defenderSecondaryType: input.defender.secondaryType
  });
  const sameTypeAttackBonus =
    input.move.type === input.attacker.primaryType ||
    input.move.type === input.attacker.secondaryType
      ? 1.2
      : 1;
  const baseDamage =
    (((2 * level) / 5 + 2) * movePower * (attack / defense)) / 50 + 2;

  return Math.max(
    1,
    Math.floor(
      baseDamage * sameTypeAttackBonus * typeEffectiveness * randomModifier
    )
  );
};

export const determineLionTurnOrder = (
  first: LionBattleParticipant,
  second: LionBattleParticipant
): [LionBattleParticipant, LionBattleParticipant] => {
  if (first.stats.speed === second.stats.speed) {
    return first.id.localeCompare(second.id) <= 0
      ? [first, second]
      : [second, first];
  }

  return first.stats.speed > second.stats.speed
    ? [first, second]
    : [second, first];
};

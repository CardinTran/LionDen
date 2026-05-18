import type { LionElementValue } from "./lion-seed-data.js";
import type { UserLionWithSpeciesRecord } from "./lion-creature.service.js";
import {
  deriveLionStats,
  type LionDerivedStats
} from "./lion-progression.service.js";

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

export interface LionBattleRound {
  round: number;
  attackerLionId: string;
  attackerName: string;
  defenderLionId: string;
  defenderName: string;
  move: LionBattleMove;
  damage: number;
  effectiveness: number;
  defenderHpAfter: number;
}

export interface LionAutoBattleResult {
  firstLion: UserLionWithSpeciesRecord;
  secondLion: UserLionWithSpeciesRecord;
  winner: UserLionWithSpeciesRecord;
  loser: UserLionWithSpeciesRecord;
  rounds: LionBattleRound[];
  finalHp: Record<string, number>;
}

export interface LionTeamAutoBattleResult {
  firstTeam: UserLionWithSpeciesRecord[];
  secondTeam: UserLionWithSpeciesRecord[];
  winnerSide: "first" | "second";
  loserSide: "first" | "second";
  rounds: LionBattleRound[];
  finalHp: Record<string, number>;
  participantLionIds: {
    first: string[];
    second: string[];
  };
}

export const DEFAULT_LION_MOVE: LionBattleMove = {
  key: "pounce",
  name: "Pounce",
  type: "NEUTRAL",
  power: 40,
  accuracy: 100
};

export const LION_TYPE_MOVES: Record<LionElementValue, LionBattleMove> = {
  EARTH: {
    key: "stone-crash",
    name: "Stone Crash",
    type: "EARTH",
    power: 46,
    accuracy: 95
  },
  FIRE: {
    key: "ember-pounce",
    name: "Ember Pounce",
    type: "FIRE",
    power: 48,
    accuracy: 95
  },
  LIGHT: {
    key: "sun-flare",
    name: "Sun Flare",
    type: "LIGHT",
    power: 48,
    accuracy: 95
  },
  METAL: {
    key: "iron-claw",
    name: "Iron Claw",
    type: "METAL",
    power: 46,
    accuracy: 95
  },
  NATURE: {
    key: "vine-lash",
    name: "Vine Lash",
    type: "NATURE",
    power: 46,
    accuracy: 95
  },
  NEUTRAL: DEFAULT_LION_MOVE,
  SHADOW: {
    key: "night-swipe",
    name: "Night Swipe",
    type: "SHADOW",
    power: 48,
    accuracy: 95
  },
  WATER: {
    key: "tide-slam",
    name: "Tide Slam",
    type: "WATER",
    power: 46,
    accuracy: 95
  },
  WIND: {
    key: "gale-strike",
    name: "Gale Strike",
    type: "WIND",
    power: 46,
    accuracy: 95
  }
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

export const getLionMoveSet = (
  lion: UserLionWithSpeciesRecord
): LionBattleMove[] => {
  const moves = [LION_TYPE_MOVES[lion.species.primaryType]];

  if (lion.species.secondaryType) {
    moves.push(LION_TYPE_MOVES[lion.species.secondaryType]);
  }

  if (!moves.some((move) => move.key === DEFAULT_LION_MOVE.key)) {
    moves.push(DEFAULT_LION_MOVE);
  }

  return moves;
};

export const selectAutoBattleMove = (input: {
  lion: UserLionWithSpeciesRecord;
  round: number;
}): LionBattleMove => {
  const moves = getLionMoveSet(input.lion);

  return moves[(input.round - 1) % moves.length] ?? DEFAULT_LION_MOVE;
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

const toBattleParticipant = (
  lion: UserLionWithSpeciesRecord
): LionBattleParticipant => ({
  id: lion.id,
  level: lion.level,
  primaryType: lion.species.primaryType,
  secondaryType: lion.species.secondaryType,
  stats: deriveLionStats(lion.species, lion.level)
});

const getBattleName = (lion: UserLionWithSpeciesRecord): string =>
  lion.nickname ?? lion.species.name;

export const resolveAutoLionBattle = (input: {
  firstLion: UserLionWithSpeciesRecord;
  secondLion: UserLionWithSpeciesRecord;
  random?: () => number;
  maxRounds?: number;
}): LionAutoBattleResult => {
  const firstParticipant = toBattleParticipant(input.firstLion);
  const secondParticipant = toBattleParticipant(input.secondLion);
  const participantById = new Map<string, LionBattleParticipant>([
    [firstParticipant.id, firstParticipant],
    [secondParticipant.id, secondParticipant]
  ]);
  const lionById = new Map<string, UserLionWithSpeciesRecord>([
    [input.firstLion.id, input.firstLion],
    [input.secondLion.id, input.secondLion]
  ]);
  const finalHp: Record<string, number> = {
    [input.firstLion.id]: firstParticipant.stats.hp,
    [input.secondLion.id]: secondParticipant.stats.hp
  };
  const rounds: LionBattleRound[] = [];
  const maxRounds = Math.max(1, input.maxRounds ?? 12);
  const random = input.random ?? Math.random;

  const baseTurnOrder = determineLionTurnOrder(
    firstParticipant,
    secondParticipant
  );

  for (let round = 1; round <= maxRounds; round += 1) {
    for (const attacker of baseTurnOrder) {
      const defender =
        attacker.id === firstParticipant.id
          ? secondParticipant
          : firstParticipant;

      if (finalHp[attacker.id] <= 0 || finalHp[defender.id] <= 0) {
        continue;
      }

      const attackerLion = lionById.get(attacker.id);
      const defenderLion = lionById.get(defender.id);

      if (!attackerLion || !defenderLion) {
        continue;
      }

      const move = selectAutoBattleMove({
        lion: attackerLion,
        round
      });
      const randomModifier = 0.85 + random() * 0.15;
      const damage = calculateLionMoveDamage({
        attacker,
        defender,
        move,
        randomModifier
      });
      const effectiveness = getTypeEffectiveness({
        attackType: move.type,
        defenderPrimaryType: defender.primaryType,
        defenderSecondaryType: defender.secondaryType
      });

      finalHp[defender.id] = Math.max(0, finalHp[defender.id] - damage);
      rounds.push({
        round,
        attackerLionId: attacker.id,
        attackerName: getBattleName(attackerLion),
        defenderLionId: defender.id,
        defenderName: getBattleName(defenderLion),
        move,
        damage,
        effectiveness,
        defenderHpAfter: finalHp[defender.id]
      });
    }

    if (
      finalHp[firstParticipant.id] <= 0 ||
      finalHp[secondParticipant.id] <= 0
    ) {
      break;
    }
  }

  const firstHp = finalHp[firstParticipant.id];
  const secondHp = finalHp[secondParticipant.id];
  const winnerParticipant =
    firstHp === secondHp
      ? (participantById.get(baseTurnOrder[0].id) ?? firstParticipant)
      : firstHp > secondHp
        ? firstParticipant
        : secondParticipant;
  const loserParticipant =
    winnerParticipant.id === firstParticipant.id
      ? secondParticipant
      : firstParticipant;

  return {
    firstLion: input.firstLion,
    secondLion: input.secondLion,
    winner: lionById.get(winnerParticipant.id) ?? input.firstLion,
    loser: lionById.get(loserParticipant.id) ?? input.secondLion,
    rounds,
    finalHp
  };
};

const initializeTeamHp = (
  team: UserLionWithSpeciesRecord[],
  finalHp: Record<string, number>
): void => {
  for (const lion of team) {
    finalHp[lion.id] = deriveLionStats(lion.species, lion.level).hp;
  }
};

const getTeamTotalHp = (
  team: UserLionWithSpeciesRecord[],
  finalHp: Record<string, number>
): number =>
  team.reduce((total, lion) => total + Math.max(0, finalHp[lion.id] ?? 0), 0);

export const resolveAutoLionTeamBattle = (input: {
  firstTeam: UserLionWithSpeciesRecord[];
  secondTeam: UserLionWithSpeciesRecord[];
  random?: () => number;
  maxRounds?: number;
}): LionTeamAutoBattleResult => {
  if (input.firstTeam.length === 0 || input.secondTeam.length === 0) {
    throw new Error("Both teams need at least one lion to battle.");
  }

  const finalHp: Record<string, number> = {};
  const rounds: LionBattleRound[] = [];
  const firstParticipantIds = new Set<string>();
  const secondParticipantIds = new Set<string>();
  const maxRounds = Math.max(1, input.maxRounds ?? 60);
  const random = input.random ?? Math.random;
  let firstIndex = 0;
  let secondIndex = 0;

  initializeTeamHp(input.firstTeam, finalHp);
  initializeTeamHp(input.secondTeam, finalHp);

  for (let round = 1; round <= maxRounds; round += 1) {
    const firstLion = input.firstTeam[firstIndex];
    const secondLion = input.secondTeam[secondIndex];

    if (!firstLion || !secondLion) {
      break;
    }

    firstParticipantIds.add(firstLion.id);
    secondParticipantIds.add(secondLion.id);

    const firstParticipant = toBattleParticipant(firstLion);
    const secondParticipant = toBattleParticipant(secondLion);
    const baseTurnOrder = determineLionTurnOrder(
      firstParticipant,
      secondParticipant
    );

    for (const attacker of baseTurnOrder) {
      const attackerLion =
        attacker.id === firstLion.id ? firstLion : secondLion;
      const defenderLion =
        attacker.id === firstLion.id ? secondLion : firstLion;
      const defender =
        attacker.id === firstLion.id ? secondParticipant : firstParticipant;

      if (finalHp[attackerLion.id] <= 0 || finalHp[defenderLion.id] <= 0) {
        continue;
      }

      const move = selectAutoBattleMove({
        lion: attackerLion,
        round
      });
      const randomModifier = 0.85 + random() * 0.15;
      const damage = calculateLionMoveDamage({
        attacker,
        defender,
        move,
        randomModifier
      });
      const effectiveness = getTypeEffectiveness({
        attackType: move.type,
        defenderPrimaryType: defender.primaryType,
        defenderSecondaryType: defender.secondaryType
      });

      finalHp[defenderLion.id] = Math.max(0, finalHp[defenderLion.id] - damage);
      rounds.push({
        round,
        attackerLionId: attackerLion.id,
        attackerName: getBattleName(attackerLion),
        defenderLionId: defenderLion.id,
        defenderName: getBattleName(defenderLion),
        move,
        damage,
        effectiveness,
        defenderHpAfter: finalHp[defenderLion.id]
      });

      if (finalHp[defenderLion.id] <= 0) {
        if (defenderLion.id === firstLion.id) {
          firstIndex += 1;
        } else {
          secondIndex += 1;
        }
        break;
      }
    }

    if (
      firstIndex >= input.firstTeam.length ||
      secondIndex >= input.secondTeam.length
    ) {
      break;
    }
  }

  const firstTeamHp = getTeamTotalHp(input.firstTeam, finalHp);
  const secondTeamHp = getTeamTotalHp(input.secondTeam, finalHp);
  const winnerSide = firstTeamHp >= secondTeamHp ? "first" : "second";
  const loserSide = winnerSide === "first" ? "second" : "first";

  return {
    firstTeam: input.firstTeam,
    secondTeam: input.secondTeam,
    winnerSide,
    loserSide,
    rounds,
    finalHp,
    participantLionIds: {
      first: [...firstParticipantIds],
      second: [...secondParticipantIds]
    }
  };
};

export const getLionBattleDamageByLion = (
  rounds: Pick<LionBattleRound, "attackerLionId" | "damage">[]
): Map<string, number> => {
  const damageByLionId = new Map<string, number>();

  for (const round of rounds) {
    damageByLionId.set(
      round.attackerLionId,
      (damageByLionId.get(round.attackerLionId) ?? 0) + round.damage
    );
  }

  return damageByLionId;
};

export const getLionBattleMvpLionId = (
  result: Pick<LionTeamAutoBattleResult, "rounds" | "participantLionIds">
): string | null => {
  const damageByLionId = getLionBattleDamageByLion(result.rounds);
  const participants = [
    ...result.participantLionIds.first,
    ...result.participantLionIds.second
  ];

  return (
    participants
      .map((lionId) => ({
        lionId,
        damage: damageByLionId.get(lionId) ?? 0
      }))
      .sort((first, second) => {
        if (second.damage !== first.damage) {
          return second.damage - first.damage;
        }

        return first.lionId.localeCompare(second.lionId);
      })[0]?.lionId ?? null
  );
};

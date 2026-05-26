import {
  calculateLionMoveDamage,
  DEFAULT_LION_MOVE,
  determineLionTurnOrder,
  getLionMoveSet,
  getTypeEffectiveness,
  type LionBattleMove,
  type LionBattleParticipant
} from "./lion-battle.service.js";
import type { UserLionWithSpeciesRecord } from "./lion-creature.service.js";
import { getOwnedLionDisplayName } from "./lion-creature.service.js";
import { deriveLionStats } from "./lion-progression.service.js";

export type LionDuelStatus = "PENDING" | "ACTIVE" | "ENDED" | "CANCELED";
export type LionDuelAction = "basic" | "special" | "guard";

export const LION_DUEL_PENDING_DURATION_MS = 2 * 60 * 1000;
export const LION_DUEL_TURN_DURATION_MS = 5 * 60 * 1000;

export interface LionDuelParticipantState {
  userId: string;
  displayName: string;
  lion: UserLionWithSpeciesRecord;
  maxHp: number;
  hp: number;
  guarding: boolean;
}

export interface LionDuelState {
  id: string;
  guildId: string;
  channelId: string;
  status: LionDuelStatus;
  challenger: LionDuelParticipantState;
  opponent: LionDuelParticipantState;
  turnUserId: string | null;
  winnerUserId: string | null;
  loserUserId: string | null;
  round: number;
  log: string[];
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

export type CreateLionDuelResult =
  | {
      outcome: "created";
      duel: LionDuelState;
    }
  | {
      outcome: "active_duel_exists";
      duel: LionDuelState;
    };

export type LionDuelInteractionResult =
  | {
      outcome: "accepted" | "declined" | "canceled" | "updated";
      duel: LionDuelState;
    }
  | {
      outcome:
        | "not_found"
        | "not_pending"
        | "not_active"
        | "not_participant"
        | "not_opponent"
        | "not_turn"
        | "expired";
      duel: LionDuelState | null;
    };

const duelStore = new Map<string, LionDuelState>();

const createDuelId = (): string =>
  globalThis.crypto?.randomUUID?.() ??
  `duel_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const getDuelName = (participant: LionDuelParticipantState): string =>
  getOwnedLionDisplayName(participant.lion);

const getDuelParticipant = (input: {
  userId: string;
  displayName: string;
  lion: UserLionWithSpeciesRecord;
}): LionDuelParticipantState => {
  const stats = deriveLionStats(input.lion.species, input.lion.level);

  return {
    userId: input.userId,
    displayName: input.displayName,
    lion: input.lion,
    maxHp: stats.hp,
    hp: stats.hp,
    guarding: false
  };
};

const toBattleParticipant = (
  participant: LionDuelParticipantState
): LionBattleParticipant => ({
  id: participant.lion.id,
  level: participant.lion.level,
  primaryType: participant.lion.species.primaryType,
  secondaryType: participant.lion.species.secondaryType,
  stats: deriveLionStats(participant.lion.species, participant.lion.level)
});

const getParticipants = (
  duel: LionDuelState
): [LionDuelParticipantState, LionDuelParticipantState] => [
  duel.challenger,
  duel.opponent
];

const getParticipantByUserId = (
  duel: LionDuelState,
  userId: string
): LionDuelParticipantState | null =>
  getParticipants(duel).find((participant) => participant.userId === userId) ??
  null;

const getOtherParticipant = (
  duel: LionDuelState,
  userId: string
): LionDuelParticipantState | null =>
  getParticipants(duel).find((participant) => participant.userId !== userId) ??
  null;

const isDuelExpired = (duel: LionDuelState, now: Date): boolean =>
  duel.status !== "ENDED" &&
  duel.status !== "CANCELED" &&
  duel.expiresAt.getTime() <= now.getTime();

const expireDuelIfNeeded = (duel: LionDuelState, now: Date): LionDuelState => {
  if (!isDuelExpired(duel, now)) {
    return duel;
  }

  const previousStatus = duel.status;

  duel.status = "CANCELED";
  duel.turnUserId = null;
  duel.updatedAt = now;
  duel.log = [
    ...duel.log.slice(-4),
    previousStatus === "PENDING"
      ? "The duel challenge expired."
      : "The duel timed out."
  ];
  return duel;
};

const pruneExpiredDuels = (now: Date): void => {
  for (const [duelId, duel] of duelStore.entries()) {
    if (
      duel.status === "ENDED" ||
      duel.status === "CANCELED" ||
      isDuelExpired(duel, now)
    ) {
      duelStore.delete(duelId);
    }
  }
};

const hasActiveDuelOverlap = (
  duel: LionDuelState,
  input: {
    guildId: string;
    userIds: string[];
  }
): boolean =>
  duel.guildId === input.guildId &&
  (duel.status === "PENDING" || duel.status === "ACTIVE") &&
  getParticipants(duel).some((participant) =>
    input.userIds.includes(participant.userId)
  );

export const clearLionDuelStore = (): void => {
  duelStore.clear();
};

export const getLionDuel = (duelId: string): LionDuelState | null =>
  duelStore.get(duelId) ?? null;

export const listLionDuels = (): LionDuelState[] => [...duelStore.values()];

export const createLionDuelChallenge = (input: {
  guildId: string;
  channelId: string;
  challengerUserId: string;
  challengerDisplayName: string;
  challengerLion: UserLionWithSpeciesRecord;
  opponentUserId: string;
  opponentDisplayName: string;
  opponentLion: UserLionWithSpeciesRecord;
  now: Date;
}): CreateLionDuelResult => {
  pruneExpiredDuels(input.now);
  const participantUserIds = [input.challengerUserId, input.opponentUserId];
  const existingDuel = listLionDuels().find((duel) =>
    hasActiveDuelOverlap(duel, {
      guildId: input.guildId,
      userIds: participantUserIds
    })
  );

  if (existingDuel) {
    return {
      outcome: "active_duel_exists",
      duel: existingDuel
    };
  }

  const duel: LionDuelState = {
    id: createDuelId(),
    guildId: input.guildId,
    channelId: input.channelId,
    status: "PENDING",
    challenger: getDuelParticipant({
      userId: input.challengerUserId,
      displayName: input.challengerDisplayName,
      lion: input.challengerLion
    }),
    opponent: getDuelParticipant({
      userId: input.opponentUserId,
      displayName: input.opponentDisplayName,
      lion: input.opponentLion
    }),
    turnUserId: null,
    winnerUserId: null,
    loserUserId: null,
    round: 1,
    log: [
      `${input.challengerDisplayName} challenged ${input.opponentDisplayName} to a 1v1 lion duel.`
    ],
    createdAt: input.now,
    updatedAt: input.now,
    expiresAt: new Date(input.now.getTime() + LION_DUEL_PENDING_DURATION_MS)
  };

  duelStore.set(duel.id, duel);

  return {
    outcome: "created",
    duel
  };
};

export const acceptLionDuelChallenge = (input: {
  duelId: string;
  userId: string;
  now: Date;
}): LionDuelInteractionResult => {
  const duel = getLionDuel(input.duelId);

  if (!duel) {
    return {
      outcome: "not_found",
      duel: null
    };
  }

  expireDuelIfNeeded(duel, input.now);

  if (duel.status === "CANCELED") {
    return {
      outcome: "expired",
      duel
    };
  }

  if (duel.status !== "PENDING") {
    return {
      outcome: "not_pending",
      duel
    };
  }

  if (duel.opponent.userId !== input.userId) {
    return {
      outcome: "not_opponent",
      duel
    };
  }

  const [first] = determineLionTurnOrder(
    toBattleParticipant(duel.challenger),
    toBattleParticipant(duel.opponent)
  );
  duel.status = "ACTIVE";
  duel.turnUserId =
    first.id === duel.challenger.lion.id
      ? duel.challenger.userId
      : duel.opponent.userId;
  duel.updatedAt = input.now;
  duel.expiresAt = new Date(input.now.getTime() + LION_DUEL_TURN_DURATION_MS);
  duel.log = [
    ...duel.log.slice(-4),
    `${duel.opponent.displayName} accepted. ${first.id === duel.challenger.lion.id ? duel.challenger.displayName : duel.opponent.displayName} moves first.`
  ];

  return {
    outcome: "accepted",
    duel
  };
};

export const declineLionDuelChallenge = (input: {
  duelId: string;
  userId: string;
  now: Date;
}): LionDuelInteractionResult => {
  const duel = getLionDuel(input.duelId);

  if (!duel) {
    return {
      outcome: "not_found",
      duel: null
    };
  }

  expireDuelIfNeeded(duel, input.now);

  if (duel.status === "CANCELED") {
    return {
      outcome: "expired",
      duel
    };
  }

  if (duel.status !== "PENDING") {
    return {
      outcome: "not_pending",
      duel
    };
  }

  if (duel.opponent.userId !== input.userId) {
    return {
      outcome: "not_opponent",
      duel
    };
  }

  duel.status = "CANCELED";
  duel.updatedAt = input.now;
  duel.turnUserId = null;
  duel.log = [
    ...duel.log.slice(-4),
    `${duel.opponent.displayName} declined the duel.`
  ];

  return {
    outcome: "declined",
    duel
  };
};

export const cancelLionDuel = (input: {
  duelId: string;
  userId: string;
  now: Date;
}): LionDuelInteractionResult => {
  const duel = getLionDuel(input.duelId);

  if (!duel) {
    return {
      outcome: "not_found",
      duel: null
    };
  }

  const participant = getParticipantByUserId(duel, input.userId);

  if (!participant) {
    return {
      outcome: "not_participant",
      duel
    };
  }

  if (duel.status !== "PENDING" && duel.status !== "ACTIVE") {
    return {
      outcome: "not_active",
      duel
    };
  }

  duel.status = "CANCELED";
  duel.updatedAt = input.now;
  duel.turnUserId = null;
  duel.log = [
    ...duel.log.slice(-4),
    `${participant.displayName} canceled the duel.`
  ];

  return {
    outcome: "canceled",
    duel
  };
};

const getMoveForAction = (
  lion: UserLionWithSpeciesRecord,
  action: LionDuelAction
): LionBattleMove => {
  if (action === "basic") {
    return DEFAULT_LION_MOVE;
  }

  const moves = getLionMoveSet(lion);
  return moves.find((move) => move.key !== DEFAULT_LION_MOVE.key) ?? moves[0];
};

const advanceDuelTurn = (
  duel: LionDuelState,
  nextUserId: string,
  now: Date
): void => {
  duel.turnUserId = nextUserId;
  duel.round += 1;
  duel.updatedAt = now;
  duel.expiresAt = new Date(now.getTime() + LION_DUEL_TURN_DURATION_MS);
};

export const applyLionDuelAction = (input: {
  duelId: string;
  userId: string;
  action: LionDuelAction;
  now: Date;
  random?: () => number;
}): LionDuelInteractionResult => {
  const duel = getLionDuel(input.duelId);

  if (!duel) {
    return {
      outcome: "not_found",
      duel: null
    };
  }

  expireDuelIfNeeded(duel, input.now);

  if (duel.status === "CANCELED") {
    return {
      outcome: "expired",
      duel
    };
  }

  if (duel.status !== "ACTIVE") {
    return {
      outcome: "not_active",
      duel
    };
  }

  const actor = getParticipantByUserId(duel, input.userId);
  const defender = getOtherParticipant(duel, input.userId);

  if (!actor || !defender) {
    return {
      outcome: "not_participant",
      duel
    };
  }

  if (duel.turnUserId !== input.userId) {
    return {
      outcome: "not_turn",
      duel
    };
  }

  if (input.action === "guard") {
    actor.guarding = true;
    duel.log = [
      ...duel.log.slice(-4),
      `Turn ${duel.round}: ${getDuelName(actor)} guarded.`
    ];
    advanceDuelTurn(duel, defender.userId, input.now);
    return {
      outcome: "updated",
      duel
    };
  }

  const move = getMoveForAction(actor.lion, input.action);
  const effectiveness = getTypeEffectiveness({
    attackType: move.type,
    defenderPrimaryType: defender.lion.species.primaryType,
    defenderSecondaryType: defender.lion.species.secondaryType
  });
  const random = input.random ?? Math.random;
  const rawDamage = calculateLionMoveDamage({
    attacker: toBattleParticipant(actor),
    defender: toBattleParticipant(defender),
    move,
    randomModifier: 0.85 + random() * 0.15
  });
  const damage = defender.guarding
    ? Math.max(1, Math.floor(rawDamage / 2))
    : rawDamage;
  const guardText = defender.guarding ? " Guard reduced the damage." : "";

  defender.guarding = false;
  defender.hp = Math.max(0, defender.hp - damage);
  duel.log = [
    ...duel.log.slice(-4),
    `Turn ${duel.round}: ${getDuelName(actor)} used ${move.name}, dealing ${damage} damage${effectiveness !== 1 ? ` (x${effectiveness})` : ""}.${guardText}`
  ];

  if (defender.hp <= 0) {
    duel.status = "ENDED";
    duel.turnUserId = null;
    duel.winnerUserId = actor.userId;
    duel.loserUserId = defender.userId;
    duel.updatedAt = input.now;
    duel.log = [
      ...duel.log.slice(-4),
      `${actor.displayName} won the 1v1 lion duel.`
    ];
    return {
      outcome: "updated",
      duel
    };
  }

  advanceDuelTurn(duel, defender.userId, input.now);

  return {
    outcome: "updated",
    duel
  };
};

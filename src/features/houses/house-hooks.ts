import { logger } from "../../lib/logger.js";
import {
  isHousePointStore,
  recordHousePointsForUser,
  type HousePointResult,
  type HouseStore
} from "./house.service.js";

export const HOUSE_PRACTICE_ATTENDANCE_POINTS = 10;
export const HOUSE_WEEKLY_CHALLENGE_POINTS = 5;
export const HOUSE_RED_ENVELOPE_CLAIM_POINTS = 1;
export const HOUSE_LION_CATCH_POINTS = 1;
export const HOUSE_LION_TRAINING_POINTS = 1;
export const HOUSE_TRAINING_BATTLE_POINTS = 2;
export const HOUSE_DUEL_COMPLETION_POINTS = 2;

const recordHousePointsSafely = async (
  store: unknown,
  input: {
    guildId: string;
    userId: string;
    sourceType: Parameters<typeof recordHousePointsForUser>[1]["sourceType"];
    sourceId: string;
    points: number;
    reason: string;
    logMessage: string;
  }
): Promise<void> => {
  if (!isHousePointStore(store)) {
    return;
  }

  try {
    await recordHousePointsForUser(store, {
      guildId: input.guildId,
      userId: input.userId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      points: input.points,
      reason: input.reason
    });
  } catch (error) {
    logger.warn(input.logMessage, {
      guildId: input.guildId,
      userId: input.userId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      points: input.points,
      error
    });
  }
};

export const recordPracticeAttendanceHousePoints = async (
  store: HouseStore,
  input: {
    guildId: string;
    userId: string;
    practiceSessionId: string;
  }
): Promise<HousePointResult> =>
  recordHousePointsForUser(store, {
    guildId: input.guildId,
    userId: input.userId,
    sourceType: "PRACTICE_ATTENDANCE",
    sourceId: `${input.practiceSessionId}:${input.userId}`,
    points: HOUSE_PRACTICE_ATTENDANCE_POINTS,
    reason: "Practice attendance"
  });

export const recordWeeklyChallengeHousePoints = async (
  store: HouseStore,
  input: {
    guildId: string;
    userId: string;
    weekKey: string;
    challengeKey: string;
  }
): Promise<HousePointResult> =>
  recordHousePointsForUser(store, {
    guildId: input.guildId,
    userId: input.userId,
    sourceType: "WEEKLY_CHALLENGE",
    sourceId: `${input.weekKey}:${input.challengeKey}:${input.userId}`,
    points: HOUSE_WEEKLY_CHALLENGE_POINTS,
    reason: `Weekly challenge completed: ${input.challengeKey}`
  });

export const recordRedEnvelopeClaimHousePoints = async (
  store: HouseStore,
  input: {
    guildId: string;
    userId: string;
    redEnvelopeId: string;
  }
): Promise<HousePointResult> =>
  recordHousePointsForUser(store, {
    guildId: input.guildId,
    userId: input.userId,
    sourceType: "RED_ENVELOPE_CLAIM",
    sourceId: `red_envelope:${input.redEnvelopeId}:${input.userId}`,
    points: HOUSE_RED_ENVELOPE_CLAIM_POINTS,
    reason: "Red envelope claim"
  });

export const recordLionCatchHousePoints = async (
  store: HouseStore,
  input: {
    guildId: string;
    userId: string;
    sourceId: string;
  }
): Promise<HousePointResult> =>
  recordHousePointsForUser(store, {
    guildId: input.guildId,
    userId: input.userId,
    sourceType: "LION_CATCH",
    sourceId: input.sourceId,
    points: HOUSE_LION_CATCH_POINTS,
    reason: "Wild lion catch"
  });

export const recordLionTrainingHousePoints = async (
  store: HouseStore,
  input: {
    guildId: string;
    userId: string;
    sourceId: string;
  }
): Promise<HousePointResult> =>
  recordHousePointsForUser(store, {
    guildId: input.guildId,
    userId: input.userId,
    sourceType: "LION_TRAINING",
    sourceId: input.sourceId,
    points: HOUSE_LION_TRAINING_POINTS,
    reason: "Lion training"
  });

export const recordTrainingBattleHousePoints = async (
  store: HouseStore,
  input: {
    guildId: string;
    userId: string;
    battleRecordId: string;
  }
): Promise<HousePointResult> =>
  recordHousePointsForUser(store, {
    guildId: input.guildId,
    userId: input.userId,
    sourceType: "TRAINING_BATTLE",
    sourceId: `training_battle:${input.battleRecordId}:${input.userId}`,
    points: HOUSE_TRAINING_BATTLE_POINTS,
    reason: "Training Hall battle"
  });

export const recordDuelCompletionHousePoints = async (
  store: HouseStore,
  input: {
    guildId: string;
    userId: string;
    duelId: string;
  }
): Promise<HousePointResult> =>
  recordHousePointsForUser(store, {
    guildId: input.guildId,
    userId: input.userId,
    sourceType: "DUEL_COMPLETION",
    sourceId: `duel:${input.duelId}:${input.userId}`,
    points: HOUSE_DUEL_COMPLETION_POINTS,
    reason: "Interactive duel completion"
  });

export const recordPracticeAttendanceHousePointsSafely = async (
  store: unknown,
  input: {
    guildId: string;
    userId: string;
    practiceSessionId: string;
  }
): Promise<void> => {
  await recordHousePointsSafely(store, {
    guildId: input.guildId,
    userId: input.userId,
    sourceType: "PRACTICE_ATTENDANCE",
    sourceId: `${input.practiceSessionId}:${input.userId}`,
    points: HOUSE_PRACTICE_ATTENDANCE_POINTS,
    reason: "Practice attendance",
    logMessage: "House practice attendance point recording failed"
  });
};

export const recordWeeklyChallengeHousePointsSafely = async (
  store: unknown,
  input: {
    guildId: string;
    userId: string;
    weekKey: string;
    challengeKey: string;
  }
): Promise<void> => {
  await recordHousePointsSafely(store, {
    guildId: input.guildId,
    userId: input.userId,
    sourceType: "WEEKLY_CHALLENGE",
    sourceId: `${input.weekKey}:${input.challengeKey}:${input.userId}`,
    points: HOUSE_WEEKLY_CHALLENGE_POINTS,
    reason: `Weekly challenge completed: ${input.challengeKey}`,
    logMessage: "House weekly challenge point recording failed"
  });
};

export const recordRedEnvelopeClaimHousePointsSafely = async (
  store: unknown,
  input: {
    guildId: string;
    userId: string;
    redEnvelopeId: string;
  }
): Promise<void> => {
  await recordHousePointsSafely(store, {
    guildId: input.guildId,
    userId: input.userId,
    sourceType: "RED_ENVELOPE_CLAIM",
    sourceId: `red_envelope:${input.redEnvelopeId}:${input.userId}`,
    points: HOUSE_RED_ENVELOPE_CLAIM_POINTS,
    reason: "Red envelope claim",
    logMessage: "House red envelope claim point recording failed"
  });
};

export const recordLionCatchHousePointsSafely = async (
  store: unknown,
  input: {
    guildId: string;
    userId: string;
    sourceId: string;
  }
): Promise<void> => {
  await recordHousePointsSafely(store, {
    guildId: input.guildId,
    userId: input.userId,
    sourceType: "LION_CATCH",
    sourceId: input.sourceId,
    points: HOUSE_LION_CATCH_POINTS,
    reason: "Wild lion catch",
    logMessage: "House lion catch point recording failed"
  });
};

export const recordLionTrainingHousePointsSafely = async (
  store: unknown,
  input: {
    guildId: string;
    userId: string;
    sourceId: string;
  }
): Promise<void> => {
  await recordHousePointsSafely(store, {
    guildId: input.guildId,
    userId: input.userId,
    sourceType: "LION_TRAINING",
    sourceId: input.sourceId,
    points: HOUSE_LION_TRAINING_POINTS,
    reason: "Lion training",
    logMessage: "House lion training point recording failed"
  });
};

export const recordTrainingBattleHousePointsSafely = async (
  store: unknown,
  input: {
    guildId: string;
    userId: string;
    battleRecordId: string;
  }
): Promise<void> => {
  await recordHousePointsSafely(store, {
    guildId: input.guildId,
    userId: input.userId,
    sourceType: "TRAINING_BATTLE",
    sourceId: `training_battle:${input.battleRecordId}:${input.userId}`,
    points: HOUSE_TRAINING_BATTLE_POINTS,
    reason: "Training Hall battle",
    logMessage: "House Training Hall battle point recording failed"
  });
};

export const recordDuelCompletionHousePointsSafely = async (
  store: unknown,
  input: {
    guildId: string;
    userId: string;
    duelId: string;
  }
): Promise<void> => {
  await recordHousePointsSafely(store, {
    guildId: input.guildId,
    userId: input.userId,
    sourceType: "DUEL_COMPLETION",
    sourceId: `duel:${input.duelId}:${input.userId}`,
    points: HOUSE_DUEL_COMPLETION_POINTS,
    reason: "Interactive duel completion",
    logMessage: "House duel completion point recording failed"
  });
};

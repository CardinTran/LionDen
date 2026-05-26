import { logger } from "../../lib/logger.js";
import {
  isHousePointStore,
  recordHousePointsForUser,
  type HousePointResult,
  type HouseStore
} from "./house.service.js";

export const HOUSE_PRACTICE_ATTENDANCE_POINTS = 10;
export const HOUSE_WEEKLY_CHALLENGE_POINTS = 5;

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

export const recordPracticeAttendanceHousePointsSafely = async (
  store: unknown,
  input: {
    guildId: string;
    userId: string;
    practiceSessionId: string;
  }
): Promise<void> => {
  if (!isHousePointStore(store)) {
    return;
  }

  try {
    await recordPracticeAttendanceHousePoints(store, input);
  } catch (error) {
    logger.warn("House practice attendance point recording failed", {
      guildId: input.guildId,
      userId: input.userId,
      sourceType: "PRACTICE_ATTENDANCE",
      sourceId: `${input.practiceSessionId}:${input.userId}`,
      points: HOUSE_PRACTICE_ATTENDANCE_POINTS,
      error
    });
  }
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
  if (!isHousePointStore(store)) {
    return;
  }

  try {
    await recordWeeklyChallengeHousePoints(store, input);
  } catch (error) {
    logger.warn("House weekly challenge point recording failed", {
      guildId: input.guildId,
      userId: input.userId,
      sourceType: "WEEKLY_CHALLENGE",
      sourceId: `${input.weekKey}:${input.challengeKey}:${input.userId}`,
      points: HOUSE_WEEKLY_CHALLENGE_POINTS,
      error
    });
  }
};

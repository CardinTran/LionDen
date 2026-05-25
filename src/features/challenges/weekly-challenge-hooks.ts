import type { WeeklyChallengeActivityTypeValue } from "./weekly-challenge.service.js";
import { recordWeeklyChallengeProgress } from "./weekly-challenge.service.js";
import { logger } from "../../lib/logger.js";

export const recordWeeklyChallengeProgressSafely = async (
  store: Parameters<typeof recordWeeklyChallengeProgress>[0],
  input: {
    guildId: string;
    userId: string;
    displayName: string;
    activityType: WeeklyChallengeActivityTypeValue;
    amount?: number;
    occurredAt: Date;
  }
): Promise<void> => {
  try {
    await recordWeeklyChallengeProgress(store, input);
  } catch (error) {
    logger.warn("Weekly challenge progress recording failed", {
      guildId: input.guildId,
      userId: input.userId,
      activityType: input.activityType,
      error
    });
  }
};

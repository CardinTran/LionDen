export const RED_ENVELOPE_ACTIVITY_WINDOW_MINUTES = 60;
export const RED_ENVELOPE_MIN_MESSAGES_FOR_DROP = 5;

export interface ChannelActivityEntry {
  channelId: string;
  messageCount: number;
}

export interface ChannelActivitySnapshotInput {
  guildId: string;
  now: Date;
  windowMinutes?: number;
  minMessages?: number;
}

type GuildChannelActivity = Map<string, number[]>;
type ChannelActivityState = Map<string, GuildChannelActivity>;

const activityState: ChannelActivityState = new Map();

const getWindowStart = (now: Date, windowMinutes: number): number =>
  now.getTime() - windowMinutes * 60_000;

const pruneGuildActivity = (
  guildActivity: GuildChannelActivity,
  windowStart: number
): void => {
  for (const [channelId, timestamps] of guildActivity.entries()) {
    const recentTimestamps = timestamps.filter((timestamp) => timestamp >= windowStart);

    if (recentTimestamps.length === 0) {
      guildActivity.delete(channelId);
      continue;
    }

    guildActivity.set(channelId, recentTimestamps);
  }
};

export const recordChannelActivity = (input: {
  guildId: string;
  channelId: string;
  occurredAt: Date;
}): void => {
  const guildActivity = activityState.get(input.guildId) ?? new Map<string, number[]>();
  const timestamps = guildActivity.get(input.channelId) ?? [];

  timestamps.push(input.occurredAt.getTime());
  guildActivity.set(input.channelId, timestamps);
  activityState.set(input.guildId, guildActivity);
};

export const listMostActiveChannels = (
  input: ChannelActivitySnapshotInput
): ChannelActivityEntry[] => {
  const guildActivity = activityState.get(input.guildId);

  if (!guildActivity) {
    return [];
  }

  const windowMinutes =
    input.windowMinutes ?? RED_ENVELOPE_ACTIVITY_WINDOW_MINUTES;
  const windowStart = getWindowStart(input.now, windowMinutes);

  pruneGuildActivity(guildActivity, windowStart);

  if (guildActivity.size === 0) {
    activityState.delete(input.guildId);
    return [];
  }

  const entries = Array.from(guildActivity.entries()).map(([channelId, timestamps]) => ({
    channelId,
    messageCount: timestamps.length
  }));

  const minMessages = input.minMessages ?? RED_ENVELOPE_MIN_MESSAGES_FOR_DROP;

  return entries
    .filter((entry) => entry.messageCount >= minMessages)
    .sort((left, right) => {
      if (right.messageCount !== left.messageCount) {
        return right.messageCount - left.messageCount;
      }

      return left.channelId.localeCompare(right.channelId);
    });
};

export const resetChannelActivityState = (): void => {
  activityState.clear();
};

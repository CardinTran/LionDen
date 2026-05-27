import { logger } from "../../lib/logger.js";
import type { PracticeSessionRecord } from "./practice.service.js";
import {
  getPracticeRecapForSession,
  type PracticeRecapStore
} from "./practice-recap.service.js";
import { formatPracticeRecapMessage } from "./practice-recap-formatting.js";

export interface PracticeRecapPostRecord {
  id: string;
  guildId: string;
  practiceId: string;
  channelId: string;
  messageId: string | null;
  postedAt: Date;
}

export interface PracticeRecapAutoPostStore extends PracticeRecapStore {
  practiceRecapPost: {
    findUnique(args: {
      where: {
        guildId_practiceId: {
          guildId: string;
          practiceId: string;
        };
      };
    }): Promise<PracticeRecapPostRecord | null>;
    create(args: {
      data: {
        guildId: string;
        practiceId: string;
        channelId: string;
        messageId?: string | null;
      };
    }): Promise<PracticeRecapPostRecord>;
  };
  practiceSchedule?: {
    findUnique(args: {
      where: {
        guildId: string;
      };
    }): Promise<{ channelId: string | null } | null>;
  };
}

export interface PracticeRecapAutoPostChannel {
  id: string;
  send(input: { content: string }): Promise<{ id?: string | null }>;
  isTextBased?: () => boolean;
}

export interface PracticeRecapAutoPostClient {
  channels: {
    fetch(channelId: string): Promise<unknown>;
  };
}

export type PracticeRecapAutoPostOutcome =
  | {
      outcome: "posted";
      channelId: string;
      messageId: string | null;
    }
  | {
      outcome: "posted_untracked";
      channelId: string;
      messageId: string | null;
    }
  | {
      outcome:
        | "skipped_duplicate"
        | "skipped_missing_channel"
        | "skipped_no_recap";
      channelId?: string;
      messageId?: string | null;
    }
  | {
      outcome: "failed";
      channelId?: string;
      messageId?: string | null;
      error: unknown;
    };

const isSendableChannel = (
  channel: unknown
): channel is PracticeRecapAutoPostChannel => {
  if (!channel || typeof channel !== "object") {
    return false;
  }

  const maybeChannel = channel as Partial<PracticeRecapAutoPostChannel>;

  if (typeof maybeChannel.id !== "string" || typeof maybeChannel.send !== "function") {
    return false;
  }

  return typeof maybeChannel.isTextBased === "function"
    ? maybeChannel.isTextBased()
    : true;
};

const uniqueChannelIds = (channelIds: Array<string | null | undefined>): string[] => {
  const seen = new Set<string>();

  return channelIds.filter((channelId): channelId is string => {
    if (!channelId || seen.has(channelId)) {
      return false;
    }

    seen.add(channelId);
    return true;
  });
};

export const hasPracticeRecapAutoPost = async (
  store: Pick<PracticeRecapAutoPostStore, "practiceRecapPost">,
  input: {
    guildId: string;
    practiceId: string;
  }
): Promise<PracticeRecapPostRecord | null> =>
  store.practiceRecapPost.findUnique({
    where: {
      guildId_practiceId: {
        guildId: input.guildId,
        practiceId: input.practiceId
      }
    }
  });

export const recordPracticeRecapAutoPost = async (
  store: Pick<PracticeRecapAutoPostStore, "practiceRecapPost">,
  input: {
    guildId: string;
    practiceId: string;
    channelId: string;
    messageId?: string | null;
  }
): Promise<PracticeRecapPostRecord> =>
  store.practiceRecapPost.create({
    data: {
      guildId: input.guildId,
      practiceId: input.practiceId,
      channelId: input.channelId,
      messageId: input.messageId ?? null
    }
  });

const fetchSendableChannel = async (
  client: PracticeRecapAutoPostClient | undefined,
  input: {
    guildId: string;
    practiceId: string;
    channelId: string;
  }
): Promise<PracticeRecapAutoPostChannel | null> => {
  if (!client) {
    return null;
  }

  try {
    const channel = await client.channels.fetch(input.channelId);

    return isSendableChannel(channel) ? channel : null;
  } catch (error) {
    logger.warn("Practice recap auto-post target channel fetch failed", {
      guildId: input.guildId,
      practiceId: input.practiceId,
      channelId: input.channelId,
      error
    });
    return null;
  }
};

export const getPracticeRecapAutoPostTarget = async (
  store: Pick<PracticeRecapAutoPostStore, "practiceSchedule">,
  input: {
    guildId: string;
    practiceId: string;
    session: PracticeSessionRecord;
    commandChannel?: PracticeRecapAutoPostChannel | null;
    client?: PracticeRecapAutoPostClient;
  }
): Promise<PracticeRecapAutoPostChannel | null> => {
  let configuredChannelId: string | null = null;

  if (store.practiceSchedule) {
    try {
      const schedule = await store.practiceSchedule.findUnique({
        where: {
          guildId: input.guildId
        }
      });

      configuredChannelId = schedule?.channelId ?? null;
    } catch (error) {
      logger.warn("Practice recap auto-post practice config lookup failed", {
        guildId: input.guildId,
        practiceId: input.practiceId,
        error
      });
    }
  }

  const candidateChannelIds = uniqueChannelIds([
    input.session.announcementChannelId,
    configuredChannelId,
    input.commandChannel?.id
  ]);

  for (const channelId of candidateChannelIds) {
    if (input.commandChannel?.id === channelId && isSendableChannel(input.commandChannel)) {
      return input.commandChannel;
    }

    const fetchedChannel = await fetchSendableChannel(input.client, {
      guildId: input.guildId,
      practiceId: input.practiceId,
      channelId
    });

    if (fetchedChannel) {
      return fetchedChannel;
    }
  }

  logger.warn("Practice recap auto-post skipped because no sendable channel was found", {
    guildId: input.guildId,
    practiceId: input.practiceId
  });
  return null;
};

export const postPracticeRecapToChannel = async (
  channel: PracticeRecapAutoPostChannel,
  input: {
    content: string;
  }
): Promise<{ channelId: string; messageId: string | null }> => {
  const message = await channel.send({
    content: input.content
  });

  return {
    channelId: channel.id,
    messageId: message.id ?? null
  };
};

export const autoPostPracticeRecapAfterEnd = async (
  store: PracticeRecapAutoPostStore,
  input: {
    guildId: string;
    practiceId: string;
    session: PracticeSessionRecord;
    now: Date;
    commandChannel?: PracticeRecapAutoPostChannel | null;
    client?: PracticeRecapAutoPostClient;
  }
): Promise<PracticeRecapAutoPostOutcome> => {
  try {
    const existingPost = await hasPracticeRecapAutoPost(store, input);

    if (existingPost) {
      logger.info("Practice recap auto-post skipped because it already exists", {
        guildId: input.guildId,
        practiceId: input.practiceId,
        channelId: existingPost.channelId,
        messageId: existingPost.messageId
      });
      return {
        outcome: "skipped_duplicate",
        channelId: existingPost.channelId,
        messageId: existingPost.messageId
      };
    }

    const recap = await getPracticeRecapForSession(store, {
      guildId: input.guildId,
      sessionId: input.practiceId,
      now: input.now
    });

    if (!recap) {
      logger.warn("Practice recap auto-post skipped because no recap could be generated", {
        guildId: input.guildId,
        practiceId: input.practiceId
      });
      return {
        outcome: "skipped_no_recap"
      };
    }

    const targetChannel = await getPracticeRecapAutoPostTarget(store, input);

    if (!targetChannel) {
      return {
        outcome: "skipped_missing_channel"
      };
    }

    const postedMessage = await postPracticeRecapToChannel(targetChannel, {
      content: formatPracticeRecapMessage(recap)
    });

    try {
      await recordPracticeRecapAutoPost(store, {
        guildId: input.guildId,
        practiceId: input.practiceId,
        channelId: postedMessage.channelId,
        messageId: postedMessage.messageId
      });
    } catch (error) {
      logger.warn("Practice recap auto-post tracking failed after message send", {
        guildId: input.guildId,
        practiceId: input.practiceId,
        channelId: postedMessage.channelId,
        messageId: postedMessage.messageId,
        error
      });
      return {
        outcome: "posted_untracked",
        ...postedMessage
      };
    }

    logger.info("Practice recap auto-post succeeded", {
      guildId: input.guildId,
      practiceId: input.practiceId,
      channelId: postedMessage.channelId,
      messageId: postedMessage.messageId
    });

    return {
      outcome: "posted",
      ...postedMessage
    };
  } catch (error) {
    logger.warn("Practice recap auto-post failed", {
      guildId: input.guildId,
      practiceId: input.practiceId,
      error
    });
    return {
      outcome: "failed",
      error
    };
  }
};

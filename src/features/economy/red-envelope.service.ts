import { adjustCoins } from "./coin-balance.service.js";
import type { UserProfileRecord } from "../profiles/profile.service.js";

export type RedEnvelopeStatus = "OPEN" | "CLAIMED";

export interface RedEnvelopeRecord {
  id: string;
  guildId: string;
  channelId: string;
  createdByUserId: string;
  createdByDisplayName: string;
  amount: number;
  status: RedEnvelopeStatus;
  messageId: string | null;
  claimedByUserId: string | null;
  claimedByDisplayName: string | null;
  claimedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RedEnvelopeDropConfigRecord {
  id: string;
  guildId: string;
  channelId: string;
  enabled: boolean;
  minAmount: number;
  maxAmount: number;
  minIntervalMinutes: number;
  maxIntervalMinutes: number;
  nextDropAt: Date | null;
  lastDroppedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface RedEnvelopeStore {
  redEnvelope: {
    create(args: {
      data: {
        guildId: string;
        channelId: string;
        createdByUserId: string;
        createdByDisplayName: string;
        amount: number;
      };
    }): Promise<RedEnvelopeRecord>;
    findUnique(args: {
      where: {
        id: string;
      };
    }): Promise<RedEnvelopeRecord | null>;
    update(args: {
      where: {
        id: string;
      };
      data: {
        messageId?: string;
      };
    }): Promise<RedEnvelopeRecord>;
    updateMany(args: {
      where: {
        id: string;
        status: RedEnvelopeStatus;
      };
      data: {
        status: RedEnvelopeStatus;
        claimedByUserId: string;
        claimedByDisplayName: string;
        claimedAt: Date;
      };
    }): Promise<{ count: number }>;
    findFirst(args: {
      where: {
        guildId: string;
        channelId?: string;
        status: RedEnvelopeStatus;
      };
    }): Promise<RedEnvelopeRecord | null>;
    deleteMany(args: {
      where: {
        guildId: string;
        status: RedEnvelopeStatus;
      };
    }): Promise<{ count: number }>;
  };
  redEnvelopeDropConfig: {
    findUnique(args: {
      where: {
        guildId: string;
      };
    }): Promise<RedEnvelopeDropConfigRecord | null>;
    findMany(args: {
      where: {
        enabled: boolean;
      };
    }): Promise<RedEnvelopeDropConfigRecord[]>;
    upsert(args: {
      where: {
        guildId: string;
      };
      create: {
        guildId: string;
        channelId: string;
        enabled?: boolean;
        minAmount?: number;
        maxAmount?: number;
        minIntervalMinutes?: number;
        maxIntervalMinutes?: number;
        nextDropAt?: Date | null;
        lastDroppedAt?: Date | null;
      };
      update: {
        channelId?: string;
        enabled?: boolean;
        minAmount?: number;
        maxAmount?: number;
        minIntervalMinutes?: number;
        maxIntervalMinutes?: number;
        nextDropAt?: Date | null;
        lastDroppedAt?: Date | null;
      };
    }): Promise<RedEnvelopeDropConfigRecord>;
    update(args: {
      where: {
        guildId: string;
      };
      data: {
        enabled?: boolean;
        lastDroppedAt?: Date | null;
        nextDropAt?: Date | null;
      };
    }): Promise<RedEnvelopeDropConfigRecord>;
  };
  userProfile: {
    upsert(args: {
      where: {
        guildId_userId: {
          guildId: string;
          userId: string;
        };
      };
      create: {
        guildId: string;
        userId: string;
        displayName: string;
      };
      update: {
        displayName: string;
      };
    }): Promise<UserProfileRecord>;
    update(args: {
      where: {
        guildId_userId: {
          guildId: string;
          userId: string;
        };
      };
      data: {
        displayName: string;
        xp?: number;
        level?: number;
        coins?: number;
        lastMessageXpAt?: Date | null;
        lastDailyClaimAt?: Date | null;
      };
    }): Promise<UserProfileRecord>;
  };
}

export interface CreateRedEnvelopeInput {
  guildId: string;
  channelId: string;
  createdByUserId: string;
  createdByDisplayName: string;
  amount: number;
}

export interface ClaimRedEnvelopeInput {
  envelopeId: string;
  userId: string;
  displayName: string;
  claimedAt: Date;
}

export interface ClaimRedEnvelopeResult {
  outcome: "claimed" | "already_claimed" | "not_found";
  envelope: RedEnvelopeRecord | null;
  profile: UserProfileRecord | null;
}

export interface ConfigureRedEnvelopeDropsInput {
  guildId: string;
  channelId: string;
  enabled: boolean;
  minAmount: number;
  maxAmount: number;
  minIntervalMinutes: number;
  maxIntervalMinutes: number;
  nextDropAt: Date | null;
}

export interface RandomDropGenerationInput {
  config: Pick<
    RedEnvelopeDropConfigRecord,
    "minAmount" | "maxAmount" | "minIntervalMinutes" | "maxIntervalMinutes"
  >;
  now: Date;
  random: () => number;
}

export interface RandomDropGenerationResult {
  amount: number;
  nextDropAt: Date;
}

export const createRedEnvelope = async (
  store: Pick<RedEnvelopeStore, "redEnvelope">,
  input: CreateRedEnvelopeInput
): Promise<RedEnvelopeRecord> => {
  return store.redEnvelope.create({
    data: {
      guildId: input.guildId,
      channelId: input.channelId,
      createdByUserId: input.createdByUserId,
      createdByDisplayName: input.createdByDisplayName,
      amount: input.amount
    }
  });
};

export const attachRedEnvelopeMessage = async (
  store: Pick<RedEnvelopeStore, "redEnvelope">,
  input: {
    envelopeId: string;
    messageId: string;
  }
): Promise<RedEnvelopeRecord> => {
  return store.redEnvelope.update({
    where: {
      id: input.envelopeId
    },
    data: {
      messageId: input.messageId
    }
  });
};

export const claimRedEnvelope = async (
  store: Pick<RedEnvelopeStore, "redEnvelope" | "userProfile">,
  input: ClaimRedEnvelopeInput
): Promise<ClaimRedEnvelopeResult> => {
  const envelope = await store.redEnvelope.findUnique({
    where: {
      id: input.envelopeId
    }
  });

  if (!envelope) {
    return {
      outcome: "not_found",
      envelope: null,
      profile: null
    };
  }

  if (envelope.status !== "OPEN") {
    return {
      outcome: "already_claimed",
      envelope,
      profile: null
    };
  }

  const updateResult = await store.redEnvelope.updateMany({
    where: {
      id: envelope.id,
      status: "OPEN"
    },
    data: {
      status: "CLAIMED",
      claimedByUserId: input.userId,
      claimedByDisplayName: input.displayName,
      claimedAt: input.claimedAt
    }
  });

  if (updateResult.count === 0) {
    const claimedEnvelope = await store.redEnvelope.findUnique({
      where: {
        id: envelope.id
      }
    });

    return {
      outcome: "already_claimed",
      envelope: claimedEnvelope,
      profile: null
    };
  }

  const profile = await adjustCoins(
    {
      userProfile: store.userProfile
    },
    {
      guildId: envelope.guildId,
      userId: input.userId,
      displayName: input.displayName,
      delta: envelope.amount
    }
  );

  const claimedEnvelope = await store.redEnvelope.findUnique({
    where: {
      id: envelope.id
    }
  });

  return {
    outcome: "claimed",
    envelope: claimedEnvelope,
    profile
  };
};

export const getRandomIntInclusive = (
  min: number,
  max: number,
  random: () => number
): number => {
  const safeMin = Math.ceil(Math.min(min, max));
  const safeMax = Math.floor(Math.max(min, max));
  return Math.floor(random() * (safeMax - safeMin + 1)) + safeMin;
};

export const generateRandomDrop = (
  input: RandomDropGenerationInput
): RandomDropGenerationResult => {
  const amount = getRandomIntInclusive(
    input.config.minAmount,
    input.config.maxAmount,
    input.random
  );
  const intervalMinutes = getRandomIntInclusive(
    input.config.minIntervalMinutes,
    input.config.maxIntervalMinutes,
    input.random
  );

  return {
    amount,
    nextDropAt: new Date(input.now.getTime() + intervalMinutes * 60_000)
  };
};

export const configureRedEnvelopeDrops = async (
  store: Pick<RedEnvelopeStore, "redEnvelopeDropConfig">,
  input: ConfigureRedEnvelopeDropsInput
): Promise<RedEnvelopeDropConfigRecord> => {
  return store.redEnvelopeDropConfig.upsert({
    where: {
      guildId: input.guildId
    },
    create: {
      guildId: input.guildId,
      channelId: input.channelId,
      enabled: input.enabled,
      minAmount: input.minAmount,
      maxAmount: input.maxAmount,
      minIntervalMinutes: input.minIntervalMinutes,
      maxIntervalMinutes: input.maxIntervalMinutes,
      nextDropAt: input.nextDropAt
    },
    update: {
      channelId: input.channelId,
      enabled: input.enabled,
      minAmount: input.minAmount,
      maxAmount: input.maxAmount,
      minIntervalMinutes: input.minIntervalMinutes,
      maxIntervalMinutes: input.maxIntervalMinutes,
      nextDropAt: input.nextDropAt
    }
  });
};

export const listEnabledRedEnvelopeDropConfigs = async (
  store: Pick<RedEnvelopeStore, "redEnvelopeDropConfig">
): Promise<RedEnvelopeDropConfigRecord[]> => {
  return store.redEnvelopeDropConfig.findMany({
    where: {
      enabled: true
    }
  });
};

export const getRedEnvelopeDropConfig = async (
  store: Pick<RedEnvelopeStore, "redEnvelopeDropConfig">,
  guildId: string
): Promise<RedEnvelopeDropConfigRecord | null> => {
  return store.redEnvelopeDropConfig.findUnique({
    where: {
      guildId
    }
  });
};

export const setRedEnvelopeDropConfigEnabled = async (
  store: Pick<RedEnvelopeStore, "redEnvelopeDropConfig">,
  input: {
    guildId: string;
    enabled: boolean;
  }
): Promise<RedEnvelopeDropConfigRecord> => {
  return store.redEnvelopeDropConfig.update({
    where: {
      guildId: input.guildId
    },
    data: {
      enabled: input.enabled
    }
  });
};

export const updateRedEnvelopeDropSchedule = async (
  store: Pick<RedEnvelopeStore, "redEnvelopeDropConfig">,
  input: {
    guildId: string;
    lastDroppedAt: Date;
    nextDropAt: Date;
  }
): Promise<RedEnvelopeDropConfigRecord> => {
  return store.redEnvelopeDropConfig.update({
    where: {
      guildId: input.guildId
    },
    data: {
      lastDroppedAt: input.lastDroppedAt,
      nextDropAt: input.nextDropAt
    }
  });
};

export const getOpenRedEnvelopeForGuild = async (
  store: Pick<RedEnvelopeStore, "redEnvelope">,
  guildId: string
): Promise<RedEnvelopeRecord | null> => {
  return store.redEnvelope.findFirst({
    where: {
      guildId,
      status: "OPEN"
    }
  });
};

export const getOpenRedEnvelopeForChannel = async (
  store: Pick<RedEnvelopeStore, "redEnvelope">,
  input: {
    guildId: string;
    channelId: string;
  }
): Promise<RedEnvelopeRecord | null> => {
  return store.redEnvelope.findFirst({
    where: {
      guildId: input.guildId,
      channelId: input.channelId,
      status: "OPEN"
    }
  });
};

export const clearOpenRedEnvelopesForGuild = async (
  store: Pick<RedEnvelopeStore, "redEnvelope">,
  guildId: string
): Promise<number> => {
  const result = await store.redEnvelope.deleteMany({
    where: {
      guildId,
      status: "OPEN"
    }
  });

  return result.count;
};

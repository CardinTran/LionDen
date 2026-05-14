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

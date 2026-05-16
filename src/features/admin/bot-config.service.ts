export const DEFAULT_MAINTENANCE_MESSAGE =
  "LionDen is in maintenance mode. Please try again later.";

export interface BotGuildConfigRecord {
  id: string;
  guildId: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  updatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface BotGuildConfigStore {
  botGuildConfig: {
    findUnique(args: {
      where: {
        guildId: string;
      };
    }): Promise<BotGuildConfigRecord | null>;
    upsert(args: {
      where: {
        guildId: string;
      };
      create: {
        guildId: string;
        maintenanceMode?: boolean;
        maintenanceMessage?: string;
        updatedByUserId?: string | null;
      };
      update: {
        maintenanceMode?: boolean;
        maintenanceMessage?: string;
        updatedByUserId?: string | null;
      };
    }): Promise<BotGuildConfigRecord>;
  };
}

export const normalizeMaintenanceMessage = (
  message?: string | null
): string => {
  const normalized = message?.trim();

  return normalized && normalized.length > 0
    ? normalized.slice(0, 300)
    : DEFAULT_MAINTENANCE_MESSAGE;
};

export const getBotGuildConfig = async (
  store: BotGuildConfigStore,
  guildId: string
): Promise<BotGuildConfigRecord | null> => {
  return store.botGuildConfig.findUnique({
    where: {
      guildId
    }
  });
};

export const ensureBotGuildConfig = async (
  store: BotGuildConfigStore,
  input: {
    guildId: string;
  }
): Promise<BotGuildConfigRecord> => {
  return store.botGuildConfig.upsert({
    where: {
      guildId: input.guildId
    },
    create: {
      guildId: input.guildId,
      maintenanceMode: false,
      maintenanceMessage: DEFAULT_MAINTENANCE_MESSAGE
    },
    update: {}
  });
};

export const setMaintenanceMode = async (
  store: BotGuildConfigStore,
  input: {
    guildId: string;
    enabled: boolean;
    message?: string | null;
    updatedByUserId: string;
  }
): Promise<BotGuildConfigRecord> => {
  return store.botGuildConfig.upsert({
    where: {
      guildId: input.guildId
    },
    create: {
      guildId: input.guildId,
      maintenanceMode: input.enabled,
      maintenanceMessage: normalizeMaintenanceMessage(input.message),
      updatedByUserId: input.updatedByUserId
    },
    update: {
      maintenanceMode: input.enabled,
      maintenanceMessage: normalizeMaintenanceMessage(input.message),
      updatedByUserId: input.updatedByUserId
    }
  });
};

export const isMaintenanceModeEnabled = async (
  store: BotGuildConfigStore,
  guildId: string
): Promise<boolean> => {
  const config = await getBotGuildConfig(store, guildId);

  return config?.maintenanceMode ?? false;
};

export const formatMaintenanceNotice = (
  config: BotGuildConfigRecord | null
): string => config?.maintenanceMessage || DEFAULT_MAINTENANCE_MESSAGE;

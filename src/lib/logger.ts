type LogMeta = Record<string, unknown>;

const formatMeta = (meta?: LogMeta): string => {
  if (!meta || Object.keys(meta).length === 0) {
    return "";
  }

  return ` ${JSON.stringify(meta)}`;
};

export const logger = {
  info(message: string, meta?: LogMeta): void {
    console.info(`[INFO] ${message}${formatMeta(meta)}`);
  },
  warn(message: string, meta?: LogMeta): void {
    console.warn(`[WARN] ${message}${formatMeta(meta)}`);
  },
  error(message: string, meta?: LogMeta): void {
    console.error(`[ERROR] ${message}${formatMeta(meta)}`);
  }
};

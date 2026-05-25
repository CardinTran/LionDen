type LogMeta = Record<string, unknown>;

const normalizeValue = (value: unknown): unknown => {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
      code:
        "code" in value && typeof value.code === "string"
          ? value.code
          : undefined
    };
  }

  return value;
};

const formatMeta = (meta?: LogMeta): string => {
  if (!meta || Object.keys(meta).length === 0) {
    return "";
  }

  return ` ${JSON.stringify(meta, (_key, value) => normalizeValue(value))}`;
};

const formatPrefix = (level: "INFO" | "WARN" | "ERROR"): string => {
  return `[${new Date().toISOString()}] [${level}]`;
};

export const logger = {
  info(message: string, meta?: LogMeta): void {
    console.info(`${formatPrefix("INFO")} ${message}${formatMeta(meta)}`);
  },
  warn(message: string, meta?: LogMeta): void {
    console.warn(`${formatPrefix("WARN")} ${message}${formatMeta(meta)}`);
  },
  error(message: string, meta?: LogMeta): void {
    console.error(`${formatPrefix("ERROR")} ${message}${formatMeta(meta)}`);
  }
};

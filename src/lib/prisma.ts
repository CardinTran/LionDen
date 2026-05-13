import { PrismaClient } from "@prisma/client";

declare global {
  var __lionDenPrisma__: PrismaClient | undefined;
}

export const prisma =
  globalThis.__lionDenPrisma__ ??
  new PrismaClient({
    log: ["warn", "error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__lionDenPrisma__ = prisma;
}

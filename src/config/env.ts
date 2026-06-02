import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1, "DISCORD_TOKEN is required"),
  DISCORD_CLIENT_ID: z.string().min(1, "DISCORD_CLIENT_ID is required"),
  DISCORD_GUILD_ID: z.string().min(1, "DISCORD_GUILD_ID is required"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  R2_PUBLIC_BASE_URL: z.string().url().optional()
});

export const env = envSchema.parse(process.env);

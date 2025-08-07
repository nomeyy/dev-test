import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Server-side environment variables
   */
  server: {
    AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    AUTH_DISCORD_ID: z.string(),
    AUTH_DISCORD_SECRET: z.string(),
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    // Mux environment variables
    MUX_TOKEN_ID: z.string().uuid(),
    MUX_TOKEN_SECRET: z.string().length(75),
    MUX_SIGNING_KEY_ID: z.string().length(45),
    MUX_SIGNING_KEY_SECRET: z
      .string()
      .min(200)
      .refine((val) => val.endsWith("==")),
    MUX_VIDEO_QUALITY: z.enum(["basic", "plus", "premium"]),
    MUX_WEBHOOK_SECRET: z.string().min(32),

    // Meilisearch environment variables
    MEILISEARCH_HOST: z.string().url(),
    MEILISEARCH_API_KEY: z.string(),

    // Resend environment variables
    RESEND_API_KEY: z.string().length(36),
    RESEND_TO_DEV_ADDRESS: z.string().email(),
    RESEND_FROM_EMAIL: z.string().refine((val) => {
      if (z.string().email().safeParse(val).success) return true;
      const withoutQuotes = val.replace(/"/g, "");
      const withoutChevronRight = withoutQuotes.split(">")[0] ?? val;
      const email = withoutChevronRight.split("<")[1] ?? withoutChevronRight;
      return z.string().email().safeParse(email).success;
    }),

    // Optional Tolgee API key
    TOLGEE_API_KEY: z.string().optional(),

    // Upstash Redis REST
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

    // **NEW** – Toggle to use ioredis (pub/sub support)
    USE_IOREDIS: z.enum(["true", "false"]).default("false"),
    REDIS_URL: z.string().url().optional(), // <-- new
    SERVERLESS: z.enum(["true", "false"]).optional().default("false"),
    IS_SERVERLESS: z.boolean().optional().default(false),
  },

  /**
   * Client-side environment variables
   */
  client: {
    // Add NEXT_PUBLIC_ vars if needed
  },

  /**
   * Runtime env mapping
   */
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_DISCORD_ID: process.env.AUTH_DISCORD_ID,
    AUTH_DISCORD_SECRET: process.env.AUTH_DISCORD_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    MUX_TOKEN_ID: process.env.MUX_TOKEN_ID,
    MUX_TOKEN_SECRET: process.env.MUX_TOKEN_SECRET,
    MUX_SIGNING_KEY_ID: process.env.MUX_SIGNING_KEY_ID,
    MUX_SIGNING_KEY_SECRET: process.env.MUX_SIGNING_KEY_SECRET,
    MUX_VIDEO_QUALITY: process.env.MUX_VIDEO_QUALITY,
    MUX_WEBHOOK_SECRET: process.env.MUX_WEBHOOK_SECRET,
    MEILISEARCH_HOST: process.env.MEILISEARCH_HOST,
    MEILISEARCH_API_KEY: process.env.MEILISEARCH_API_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    RESEND_TO_DEV_ADDRESS: process.env.RESEND_TO_DEV_ADDRESS,
    TOLGEE_API_KEY: process.env.TOLGEE_API_KEY,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,

    // **NEW**
    USE_IOREDIS: process.env.USE_IOREDIS,
    REDIS_URL: process.env.REDIS_URL,
    SERVERLESS: process.env.SERVERLESS,
    IS_SERVERLESS: process.env.IS_SERVERLESS,
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});

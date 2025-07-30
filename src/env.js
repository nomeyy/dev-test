import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
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
      // The "from" email address can be in the format "Name <my@email.com>" or just "my@email.com".
      // We need to extract the email part and validate it.

      // If the value is already a valid email, return true.
      if (z.string().email().safeParse(val).success) {
        return true;
      }

      // If the value is not a valid email, try to extract the email part.
      const withoutQuotes = val.replace(/"/g, "");
      const withoutChevronRight = withoutQuotes.split(">")[0] ?? val;
      const email = withoutChevronRight.split("<")[1] ?? withoutChevronRight;

      return z.string().email().safeParse(email).success;
    }),
    TOLGEE_API_KEY: z.string().optional(),
    REDIS_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

    // SSE environment variables
    SSE_ENABLED: z.string().optional(),
    SSE_HEARTBEAT_INTERVAL: z.string().optional(),
    SSE_HEARTBEAT_TIMEOUT: z.string().optional(),
    SSE_MAX_MISSED_PINGS: z.string().optional(),
    SSE_HEARTBEAT_ENABLED: z.string().optional(),
    SSE_REDIS_KEY_PREFIX: z.string().optional(),
    SSE_CONNECTION_TTL: z.string().optional(),
    SSE_CLEANUP_INTERVAL: z.string().optional(),
    SSE_MAX_CONNECTIONS: z.string().optional(),
    SSE_MAX_EVENTS_PER_SECOND: z.string().optional(),
    SSE_MAX_PAYLOAD_SIZE: z.string().optional(),
    SSE_CONNECTION_TIMEOUT: z.string().optional(),
    SSE_FEATURE_HEARTBEAT: z.string().optional(),
    SSE_FEATURE_AUTH: z.string().optional(),
    SSE_FEATURE_RATE_LIMITING: z.string().optional(),
    SSE_FEATURE_MONITORING: z.string().optional(),
    SSE_FEATURE_COMPRESSION: z.string().optional(),
    SSE_MONITORING_ENABLED: z.string().optional(),
    SSE_METRICS_INTERVAL: z.string().optional(),
    SSE_LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional(),
    SSE_REQUIRE_AUTH: z.string().optional(),
    SSE_ALLOWED_ORIGINS: z.string().optional(),
    SSE_MAX_CONNECTIONS_PER_USER: z.string().optional(),
    SSE_MAX_CONNECTIONS_PER_IP: z.string().optional(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
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
    REDIS_URL: process.env.REDIS_URL,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,

    // SSE environment variables
    SSE_ENABLED: process.env.SSE_ENABLED,
    SSE_HEARTBEAT_INTERVAL: process.env.SSE_HEARTBEAT_INTERVAL,
    SSE_HEARTBEAT_TIMEOUT: process.env.SSE_HEARTBEAT_TIMEOUT,
    SSE_MAX_MISSED_PINGS: process.env.SSE_MAX_MISSED_PINGS,
    SSE_HEARTBEAT_ENABLED: process.env.SSE_HEARTBEAT_ENABLED,
    SSE_REDIS_KEY_PREFIX: process.env.SSE_REDIS_KEY_PREFIX,
    SSE_CONNECTION_TTL: process.env.SSE_CONNECTION_TTL,
    SSE_CLEANUP_INTERVAL: process.env.SSE_CLEANUP_INTERVAL,
    SSE_MAX_CONNECTIONS: process.env.SSE_MAX_CONNECTIONS,
    SSE_MAX_EVENTS_PER_SECOND: process.env.SSE_MAX_EVENTS_PER_SECOND,
    SSE_MAX_PAYLOAD_SIZE: process.env.SSE_MAX_PAYLOAD_SIZE,
    SSE_CONNECTION_TIMEOUT: process.env.SSE_CONNECTION_TIMEOUT,
    SSE_FEATURE_HEARTBEAT: process.env.SSE_FEATURE_HEARTBEAT,
    SSE_FEATURE_AUTH: process.env.SSE_FEATURE_AUTH,
    SSE_FEATURE_RATE_LIMITING: process.env.SSE_FEATURE_RATE_LIMITING,
    SSE_FEATURE_MONITORING: process.env.SSE_FEATURE_MONITORING,
    SSE_FEATURE_COMPRESSION: process.env.SSE_FEATURE_COMPRESSION,
    SSE_MONITORING_ENABLED: process.env.SSE_MONITORING_ENABLED,
    SSE_METRICS_INTERVAL: process.env.SSE_METRICS_INTERVAL,
    SSE_LOG_LEVEL: process.env.SSE_LOG_LEVEL,
    SSE_REQUIRE_AUTH: process.env.SSE_REQUIRE_AUTH,
    SSE_ALLOWED_ORIGINS: process.env.SSE_ALLOWED_ORIGINS,
    SSE_MAX_CONNECTIONS_PER_USER: process.env.SSE_MAX_CONNECTIONS_PER_USER,
    SSE_MAX_CONNECTIONS_PER_IP: process.env.SSE_MAX_CONNECTIONS_PER_IP,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});

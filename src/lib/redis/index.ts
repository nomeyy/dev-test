import type { RedisClient } from "./types";
import { env } from "@/env";

/**
 * Singleton pattern for Redis client
 * This prevents creating multiple connections in serverless environments
 * where function instances might be reused across invocations
 */
let redisClient: RedisClient | null = null;

/**
 * Get the Redis client based on the environment.
 * In production, it uses Upstash Redis; in development/testing, it uses local Redis.
 * This function caches the client to avoid creating multiple connections.
 * @returns {Promise<RedisClient>} The Redis client instance
 */
export async function getRedis(): Promise<RedisClient> {
  // Return existing client if already initialized
  if (redisClient) return redisClient;

  // Use local Redis in development, Upstash in production
  if (env.NODE_ENV === "development") {
    redisClient = await createLocalRedisClient();
  } else {
    redisClient = await createUpstashRedisClient();
  }

  return redisClient;
}

/**
 * Create a Redis client for Upstash Redis.
 * Note: This should not be imported directly. Use the `getRedis`
 * function to retrieve the cached client instead.
 * @returns {RedisClient} Redis client for Upstash Redis
 */
export async function createUpstashRedisClient(): Promise<RedisClient> {
  // Dynamically import Upstash Redis only in production
  // This reduces bundle size for development and improves cold starts
  const { Redis: UpstashRedis } = await import("@upstash/redis");
  const upstash = new UpstashRedis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });

  // Adapter pattern: Create a unified interface over the Upstash implementation
  const client: RedisClient = {
    get: (key) => upstash.get(key),
    set: (key, value, options) => upstash.set(key, value, options),
    del: (key) => upstash.del(key),
    publish: (channel, message) => upstash.publish(channel, message),
    scan: async (cursor, options) => {
      const q = await upstash.scan(cursor, options);

      return {
        cursor: q[0],
        keys:
          typeof q[1]?.[0] === "string"
            ? (q[1] as string[])
            : (q[1] as { key: string; type: string }[]).map((k) => k.type),
      };
    },
    hget: (key, field) => upstash.hget(key, field),
    hset: (key, field, value) => upstash.hset(key, { [field]: value }),
    hdel: (key, field) => upstash.hdel(key, field),
    hgetall: (key) => upstash.hgetall(key),
    hexists: (key, field) => upstash.hexists(key, field),
  };

  return client;
}

/**
 * Create a Redis client for local Redis instance.
 * Note: This should not be imported directly. Use the `getRedis`
 * function to retrieve the cached client instead.
 * @returns {RedisClient} Redis client for local Redis
 */
export async function createLocalRedisClient(): Promise<RedisClient> {
  // Dynamically import IORedis for local Redis
  const Redis = (await import("ioredis")).default;
  const redis = new Redis({
    host: "localhost",
    port: 6379,
    maxRetriesPerRequest: 3,
  });

  // Adapter pattern: Create a unified interface over the IORedis implementation
  const client: RedisClient = {
    get: (key) => redis.get(key),
    set: (key, value, options) => {
      if (options?.ex) {
        return redis.setex(key, options.ex, value);
      }
      return redis.set(key, value);
    },
    del: (key) => redis.del(key),
    publish: (channel, message) => redis.publish(channel, message),
    scan: async (cursor, options) => {
      const [newCursor, keys] = await redis.scan(
        cursor,
        "MATCH",
        options?.match ?? "*",
        "COUNT",
        options?.count ?? 10,
      );
      return { cursor: newCursor, keys };
    },
    hget: (key, field) => redis.hget(key, field),
    hset: (key, field, value) => redis.hset(key, field, value),
    hdel: (key, field) => redis.hdel(key, field),
    hgetall: (key) => redis.hgetall(key),
    hexists: (key, field) => redis.hexists(key, field),
  };

  return client;
}

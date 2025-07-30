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
 * Uses local Redis if REDIS_URL is provided, otherwise falls back to Upstash Redis.
 * This function caches the client to avoid creating multiple connections.
 * @returns {Promise<RedisClient>} The Redis client instance
 */
export async function getRedis(): Promise<RedisClient> {
  // Return existing client if already initialized
  if (redisClient) return redisClient;

  // Use local Redis if REDIS_URL is provided, otherwise use Upstash
  if (env.REDIS_URL) {
    redisClient = await createLocalRedisClient();
  } else {
    redisClient = await createUpstashRedisClient();
  }

  return redisClient;
}

/**
 * Create a Redis client for local Redis.
 * Uses a simple in-memory fallback for Edge Runtime compatibility.
 * Note: This should not be imported directly. Use the `getRedis`
 * function to retrieve the cached client instead.
 * @returns {RedisClient} Redis client for local Redis
 */
export async function createLocalRedisClient(): Promise<RedisClient> {
  // For Edge Runtime (middleware), use a simple in-memory store
  // This is a temporary solution for rate limiting in development
  const memoryStore = new Map<string, { value: any; expiry?: number }>();

  const client: RedisClient = {
    get: async (key) => {
      const item = memoryStore.get(key);
      if (!item) return null;
      if (item.expiry && Date.now() > item.expiry) {
        memoryStore.delete(key);
        return null;
      }
      return item.value;
    },
    set: async (key, value, options) => {
      const expiry = options?.ex ? Date.now() + options.ex * 1000 : undefined;
      memoryStore.set(key, { value: value.toString(), expiry });
      return "OK";
    },
    del: async (key) => {
      const existed = memoryStore.has(key);
      memoryStore.delete(key);
      return existed ? 1 : 0;
    },
    publish: async (channel, message) => {
      // No-op for in-memory store
      return 0;
    },
    scan: async (cursor, options) => {
      const keys = Array.from(memoryStore.keys());
      return {
        cursor: "0",
        keys: keys.slice(0, options?.count || 10),
      };
    },
    hget: async (key, field) => {
      const item = memoryStore.get(`${key}:${field}`);
      return item ? item.value : null;
    },
    hset: async (key, field, value) => {
      memoryStore.set(`${key}:${field}`, { value: value.toString() });
      return 1;
    },
    hdel: async (key, field) => {
      const existed = memoryStore.has(`${key}:${field}`);
      memoryStore.delete(`${key}:${field}`);
      return existed ? 1 : 0;
    },
    hgetall: async (key) => {
      const result: Record<string, string> = {};
      for (const [k, v] of memoryStore.entries()) {
        if (k.startsWith(`${key}:`)) {
          const field = k.substring(key.length + 1);
          result[field] = v.value;
        }
      }
      return Object.keys(result).length > 0 ? result : null;
    },
    hexists: async (key, field) => {
      return memoryStore.has(`${key}:${field}`) ? 1 : 0;
    },
    sadd: async (key, member) => {
      const setKey = `set:${key}`;
      const existing = memoryStore.get(setKey);
      const members = existing
        ? new Set(JSON.parse(existing.value))
        : new Set();
      const wasNew = !members.has(member);
      members.add(member);
      memoryStore.set(setKey, { value: JSON.stringify([...members]) });
      return wasNew ? 1 : 0;
    },
    srem: async (key, member) => {
      const setKey = `set:${key}`;
      const existing = memoryStore.get(setKey);
      if (!existing) return 0;
      const members = new Set(JSON.parse(existing.value));
      const wasRemoved = members.delete(member);
      if (members.size === 0) {
        memoryStore.delete(setKey);
      } else {
        memoryStore.set(setKey, { value: JSON.stringify([...members]) });
      }
      return wasRemoved ? 1 : 0;
    },
    smembers: async (key) => {
      const setKey = `set:${key}`;
      const existing = memoryStore.get(setKey);
      return existing ? JSON.parse(existing.value) : [];
    },
    scard: async (key) => {
      const setKey = `set:${key}`;
      const existing = memoryStore.get(setKey);
      return existing ? JSON.parse(existing.value).length : 0;
    },
    expire: async (key, seconds) => {
      const item = memoryStore.get(key);
      if (!item) return 0;
      const expiry = Date.now() + seconds * 1000;
      memoryStore.set(key, { ...item, expiry });
      return 1;
    },
  };

  return client;
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
    sadd: (key, member) => upstash.sadd(key, member),
    srem: (key, member) => upstash.srem(key, member),
    smembers: (key) => upstash.smembers(key),
    scard: (key) => upstash.scard(key),
    expire: (key, seconds) => upstash.expire(key, seconds),
  };

  return client;
}

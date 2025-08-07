//lib/redis/index.ts
import type { RedisClient, RedisSubscriber } from "./types";
import { env } from "@/env";

let redisClient: RedisClient | null = null;
let subscriberClient: RedisSubscriber | null = null;

export async function getRedis(): Promise<RedisClient> {
  if (redisClient) return redisClient;

  if (env.USE_IOREDIS === "true") {
    const IORedis = (await import("ioredis")).default;
    const redis = new IORedis(env.DATABASE_URL || env.REDIS_URL || "");

    redisClient = {
      // Key operations
      get: (key) => redis.get(key),
      set: (key, value, options) =>
        options?.ex
          ? redis.set(key, value, "EX", options.ex)
          : redis.set(key, value),
      del: (key) => redis.del(key),
      exists: (key) => redis.exists(key),
      expire: (key, seconds) => redis.expire(key, seconds),

      // Scan operations
      scan: async (cursor, options) => {
        const res = await redis.scan(cursor, options || {});
        return { cursor: res[0], keys: res[1] };
      },

      // Pub/sub
      publish: (channel, message) => redis.publish(channel, message),

      // Hash operations
      hget: (key, field) => redis.hget(key, field),
      hset: (key, field, value) => redis.hset(key, field, value),
      hdel: (key, field) => redis.hdel(key, field),
      hgetall: (key) => redis.hgetall(key),
      hexists: (key, field) => redis.hexists(key, field),

      // List operations
      lpush: (key, ...elements) => redis.lpush(key, ...elements),
      lrange: (key, start, stop) => redis.lrange(key, start, stop),
      llen: (key) => redis.llen(key),
      lrem: (key, count, value) => redis.lrem(key, count, value),
      lpop: (key, count?) => (count ? redis.lpop(key, count) : redis.lpop(key)),
      rpop: (key, count?) => (count ? redis.rpop(key, count) : redis.rpop(key)),
    };
  } else {
    redisClient = await createUpstashRedisClient();
  }

  return redisClient;
}

async function createUpstashRedisClient(): Promise<RedisClient> {
  const { Redis: UpstashRedis } = await import("@upstash/redis");
  const upstash = new UpstashRedis({
    url: env.UPSTASH_REDIS_REST_URL!,
    token: env.UPSTASH_REDIS_REST_TOKEN!,
  });

  return {
    // Key operations
    get: (key) => upstash.get(key),
    set: (key, value, options) => upstash.set(key, value, options),
    del: (key) => upstash.del(key),
    exists: (key) => upstash.exists(key) as Promise<number>,
    expire: (key, seconds) => upstash.expire(key, seconds),

    // Scan operations
    scan: async (cursor, options) => {
      const q = await upstash.scan(cursor, options || {});
      return {
        cursor: q[0],
        keys:
          typeof q[1]?.[0] === "string"
            ? (q[1] as string[])
            : (q[1] as { key: string }[]).map((k) => k.key),
      };
    },

    // Pub/sub
    publish: (channel, message) =>
      upstash.publish(channel, message) as Promise<number>,

    // Hash operations
    hget: (key, field) => upstash.hget(key, field),
    hset: (key, field, value) => upstash.hset(key, { [field]: value }),
    hdel: (key, field) => upstash.hdel(key, field),
    hgetall: (key) => upstash.hgetall(key),
    hexists: (key, field) => upstash.hexists(key, field),

    // List operations
    lpush: (key, ...elements) =>
      upstash.lpush(key, elements) as Promise<number>,
    lrange: (key, start, stop) =>
      upstash.lrange(key, start, stop) as Promise<string[]>,
    llen: (key) => upstash.llen(key) as Promise<number>,
    lrem: (key, count, value) =>
      upstash.lrem(key, count, value) as Promise<number>,
    lpop: (key, count?) =>
      count
        ? (upstash.lpop(key, { count }) as Promise<string[] | null>)
        : (upstash.lpop(key) as Promise<string | null>),
    rpop: (key, count?) =>
      count
        ? (upstash.rpop(key, { count }) as Promise<string[] | null>)
        : (upstash.rpop(key) as Promise<string | null>),
  };
}

export async function getRedisSubscriber(): Promise<RedisSubscriber> {
  if (subscriberClient) return subscriberClient;
  if (env.USE_IOREDIS !== "true") throw new Error("Pub/Sub requires ioredis");

  const IORedis = (await import("ioredis")).default;
  const sub = new IORedis(env.DATABASE_URL || env.REDIS_URL || "");

  subscriberClient = {
    subscribe: (channel) => sub.subscribe(channel),
    on: (event, callback) => sub.on(event, callback),
    unsubscribe: (channel) => sub.unsubscribe(channel),
    disconnect: () => sub.disconnect(),
  };

  return subscriberClient;
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient && "disconnect" in redisClient) {
    await (redisClient as any).disconnect();
  }
  if (subscriberClient) {
    await subscriberClient.disconnect();
  }
  redisClient = null;
  subscriberClient = null;
}

import { Ratelimit as UpstashRatelimit } from "@upstash/ratelimit";
import { Redis as UpstashRedis } from "@upstash/redis";
import type { RedisClient } from "@/lib/redis/types";
import type { RateLimiter, RateLimitResult } from "./types";
import { env } from "@/env";

let upstash: UpstashRedis | null = null;
let rateLimiter: RateLimiter | null = null;

/**
 * Simple sliding window rate limiter implementation for local Redis
 */
class LocalRateLimiter implements RateLimiter {
  constructor(
    private redis: RedisClient,
    private limitCount: number,
    private windowSec: number,
  ) {}

  async limit(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const redisKey = `ratelimit:${key}`;

    // Get current count from Redis
    const currentCountStr = await this.redis.get(redisKey);
    const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0;

    // Check if limit is exceeded
    if (currentCount >= this.limitCount) {
      return {
        success: false,
        limit: this.limitCount,
        remaining: 0,
        reset: Math.floor((now + this.windowSec * 1000) / 1000),
      };
    }

    // Increment counter
    const newCount = currentCount + 1;
    await this.redis.set(redisKey, newCount, { ex: this.windowSec });

    return {
      success: true,
      limit: this.limitCount,
      remaining: this.limitCount - newCount,
      reset: Math.floor((now + this.windowSec * 1000) / 1000),
    };
  }
}

export async function getRateLimiter(
  redis: RedisClient,
  opts: { limit: number; windowSec: number },
): Promise<RateLimiter> {
  // If we already have a rate limiter instance, return it
  if (rateLimiter) {
    return rateLimiter;
  }

  // Prioritize local Redis if REDIS_URL is available
  if (env.REDIS_URL) {
    // Use local rate limiter
    rateLimiter = new LocalRateLimiter(redis, opts.limit, opts.windowSec);
  } else if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    // Use Upstash rate limiter as fallback
    upstash =
      upstash ??
      new UpstashRedis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
      });

    rateLimiter = new UpstashRatelimit({
      redis: upstash,
      limiter: UpstashRatelimit.slidingWindow(opts.limit, `${opts.windowSec}s`),
      analytics: true,
      prefix: "ratelimit",
    });
  } else {
    throw new Error(
      "No Redis configuration found. Please set either REDIS_URL or Upstash Redis credentials.",
    );
  }

  return rateLimiter;
}

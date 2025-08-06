import { getRedis } from "@/lib/redis";
import { getRateLimiter } from "@/lib/rate-limit";
import { withErrorResponse, withHeaders } from "../utils";
import type { Middleware } from "../types";
import { LIMIT_PER_WINDOW, WINDOW_IN_SECONDS } from "../config";

export const rateLimitMiddleware: Middleware = async (req, next) => {
  const redis = await getRedis();
  const limiter = await getRateLimiter(redis, {
    limit: LIMIT_PER_WINDOW,
    windowSec: WINDOW_IN_SECONDS,
  });

  const ip =
    req.headers.get("x-forwarded-for")?.toString() ??
    req.headers.get("x-real-ip")?.toString() ??
    req.headers.get("host")?.toString() ??
    "unknown";

  try {
    const { success, limit, remaining, reset } = await limiter.limit(ip);

    const responseHeaders = {
      "X-RateLimit-Limit": limit.toString(),
      "X-RateLimit-Remaining": remaining.toString(),
      "X-RateLimit-Reset": reset.toString(),
    };

    if (!success) {
      console.warn(`Rate limit exceeded for IP: ${ip}`);
      return withErrorResponse("Rate limit exceeded", 429, {
        ...responseHeaders,
        "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
      });
    }

    const resp = await next();
    return withHeaders(resp, responseHeaders);
  } catch (error) {
    console.error("Rate limiter failed:");
    return await next();
  }
};


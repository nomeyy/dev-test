/**
 * Shared utilities for SSE API endpoints
 * Reduces code duplication across endpoints
 */

import { NextResponse } from "next/server";
import { sseLogger } from "@/lib/sse/logger";

// Re-export NextResponse for convenience
export { NextResponse };

/**
 * Standard error response helper
 */
export function createErrorResponse(
  message: string,
  status = 500,
  component = "SSE API",
  error?: Error,
  context?: Record<string, unknown>,
): Response {
  if (error) {
    sseLogger.error(component, message, context, error);
  } else {
    sseLogger.warn(component, message, context);
  }

  return NextResponse.json(
    {
      error: message,
      ...(error && { details: error.message }),
    },
    { status },
  );
}

/**
 * Standard success response helper
 */
export function createSuccessResponse(
  data: Record<string, unknown>,
  component = "SSE API",
  message?: string,
  context?: Record<string, unknown>,
): Response {
  if (message) {
    sseLogger.info(component, message, context);
  }

  return NextResponse.json({
    success: true,
    ...data,
  });
}

/**
 * Extract client metadata from request
 */
export function extractClientMetadata(request: Request): {
  userAgent?: string;
  ip?: string;
  referer?: string;
} {
  const userAgent = request.headers.get("user-agent") ?? "unknown";
  const ip =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const referer = request.headers.get("referer") ?? "unknown";

  return { userAgent, ip, referer };
}

/**
 * Validate target and targetId for send operations
 */
export function validateSendTarget(
  target: string,
  targetId?: string,
): { isValid: boolean; error?: string } {
  const validTargets = ["broadcast", "client", "user", "session"];

  if (!validTargets.includes(target)) {
    return {
      isValid: false,
      error: `Invalid target type. Must be one of: ${validTargets.join(", ")}`,
    };
  }

  if (target !== "broadcast" && !targetId) {
    return {
      isValid: false,
      error: `Target ID is required for target type: ${target}`,
    };
  }

  return { isValid: true };
}

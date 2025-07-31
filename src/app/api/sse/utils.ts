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
  status: number = 500,
  component: string = "SSE API",
  error?: Error,
  context?: Record<string, any>,
) {
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
  data: Record<string, any>,
  component: string = "SSE API",
  message?: string,
  context?: Record<string, any>,
) {
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
export function extractClientMetadata(request: Request) {
  return {
    userAgent: request.headers.get("user-agent") || "unknown",
    ip:
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown",
  };
}

/**
 * Validate target and targetId for send operations
 */
export function validateSendTarget(
  target: string,
  targetId?: string,
): { isValid: boolean; error?: string } {
  const requiresTargetId = ["client", "user", "session"];

  if (requiresTargetId.includes(target) && !targetId) {
    return {
      isValid: false,
      error: `targetId is required for ${target} target`,
    };
  }

  const validTargets = ["client", "user", "session", "broadcast", "all"];
  if (!validTargets.includes(target)) {
    return {
      isValid: false,
      error: `Invalid target. Use: ${validTargets.join(", ")}`,
    };
  }

  return { isValid: true };
}

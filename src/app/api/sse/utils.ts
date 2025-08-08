/**
 * SSE API Utilities
 *
 * Shared utilities for SSE API endpoints
 */

import { NextResponse } from "next/server";
import { z } from "zod";

// Validation schemas
export const ConnectionParamsSchema = z.object({
  userId: z.string().min(1).max(100).optional(),
  sessionId: z.string().min(1).max(100).optional(),
});

export const SendEventRequestSchema = z.object({
  target: z.enum(["client", "user", "session", "broadcast", "all"]),
  targetId: z.string().min(1).max(100).optional(),
  event: z.object({
    type: z.string().min(1).max(100),
    data: z.unknown(), // Required field - can be any JSON-serializable value
    id: z.string().optional(),
    retry: z.number().positive().optional(),
  }),
});

export const PingRequestSchema = z.object({
  clientId: z.string().min(1),
});

interface ErrorResponse {
  success: false;
  error: string;
  details?: unknown;
}

interface SuccessResponse {
  success: true;
  data: unknown;
  message?: string;
}

/**
 * Create error response
 */
export function createErrorResponse(
  message: string,
  status = 500,
  details?: unknown,
): Response {
  console.error(`SSE API Error: ${message}`, details);

  const errorResponse: ErrorResponse = {
    success: false,
    error: message,
  };

  if (details !== undefined) {
    errorResponse.details = details;
  }

  return NextResponse.json(errorResponse, { status });
}

/**
 * Create success response
 */
export function createSuccessResponse(
  data: unknown,
  message?: string,
): Response {
  const response: SuccessResponse = {
    success: true,
    data,
  };

  if (message) {
    response.message = message;
  }

  return NextResponse.json(response);
}

/**
 * Extract client metadata from request
 */
export function extractClientMetadata(request: Request): {
  userAgent?: string;
  ip?: string;
  referer?: string;
} {
  const headers = request.headers;

  return {
    userAgent: headers.get("user-agent") ?? undefined,
    ip: headers.get("x-forwarded-for") ?? headers.get("x-real-ip") ?? undefined,
    referer: headers.get("referer") ?? undefined,
  };
}

/**
 * Validate request body
 */
export async function validateRequestBody<T>(
  request: Request,
  schema: z.ZodSchema<T>,
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const body = (await request.json()) as T;
    const result = schema.safeParse(body);

    if (!result.success) {
      return {
        success: false,
        error: result.error.errors[0]?.message ?? "Validation failed",
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    return {
      success: false,
      error: "Invalid JSON body",
    };
  }
}

/**
 * Parse query parameters
 */
export function parseQueryParams(url: string): {
  userId?: string;
  sessionId?: string;
} {
  const { searchParams } = new URL(url);

  return {
    userId: searchParams.get("userId") ?? undefined,
    sessionId: searchParams.get("sessionId") ?? undefined,
  };
}

/**
 * Create SSE headers
 */
export function createSSEHeaders(): HeadersInit {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

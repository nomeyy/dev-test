import { type NextRequest, NextResponse } from "next/server";
import { sseConnectionManager } from "../../../features/sse/server/SSEConnectionManager";

/**
 * GET /api/sse
 *
 * Server-Sent Events (SSE) endpoint for real-time communication.
 * Requires a clientId query parameter to establish a connection.
 *
 * @example
 * GET /api/sse?clientId=user123
 */
export async function GET(request: NextRequest) {
  try {
    // Extract clientId from query string
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    // Validate clientId parameter
    if (!clientId) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "clientId query parameter is required",
          example: "/api/sse?clientId=user123",
        },
        { status: 400 },
      );
    }

    // Validate clientId is not empty or just whitespace
    if (!clientId.trim()) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "clientId cannot be empty or contain only whitespace",
          example: "/api/sse?clientId=user123",
        },
        { status: 400 },
      );
    }

    console.log(`[SSE API] Creating SSE connection for client: ${clientId}`);

    // Create and return streaming SSE response
    const sseResponse = sseConnectionManager.createSSEResponse(clientId);

    console.log(
      `[SSE API] SSE response created successfully for client: ${clientId}`,
    );

    return sseResponse;
  } catch (error) {
    console.error("[SSE API] Error creating SSE connection:", error);

    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to establish SSE connection",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

/**
 * Reject all other HTTP methods
 */
export async function POST() {
  return NextResponse.json(
    { error: "Method Not Allowed", message: "Only GET requests are allowed" },
    { status: 405, headers: { Allow: "GET" } },
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: "Method Not Allowed", message: "Only GET requests are allowed" },
    { status: 405, headers: { Allow: "GET" } },
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Method Not Allowed", message: "Only GET requests are allowed" },
    { status: 405, headers: { Allow: "GET" } },
  );
}

export async function PATCH() {
  return NextResponse.json(
    { error: "Method Not Allowed", message: "Only GET requests are allowed" },
    { status: 405, headers: { Allow: "GET" } },
  );
}

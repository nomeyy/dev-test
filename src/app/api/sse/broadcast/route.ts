/**
 * @fileoverview SSE Broadcast API Endpoint
 *
 * This endpoint allows broadcasting messages to all connected SSE clients.
 * It demonstrates how backend modules can integrate with the SSE manager
 * to send system-wide notifications without managing SSE protocol details.
 *
 * Usage:
 * POST /api/sse/broadcast
 * Body: { message: string }
 *
 * This endpoint is used by the SSE client component for testing
 * broadcast message sending functionality.
 */

import type { NextRequest } from "next/server";
import { sseManager } from "@/lib/sse";

/**
 * POST handler for broadcasting SSE messages
 *
 * Accepts a message and broadcasts it to all connected clients
 * via the SSE manager. This demonstrates how other parts of the application
 * can send system-wide notifications without managing connection details.
 *
 * @param req - NextRequest containing message in JSON body
 * @returns Response indicating success or failure
 *
 * @example
 * ```typescript
 * // Broadcast message to all connected clients
 * await fetch('/api/sse/broadcast', {
 *   method: 'POST',
 *   body: JSON.stringify({ message: 'System maintenance in 5 minutes' })
 * });
 * ```
 */
export async function POST(req: NextRequest) {
  try {
    // Parse request body with proper typing
    const body = (await req.json()) as { message: string };
    const { message } = body;

    // Validate required fields
    if (!message) {
      return new Response("Missing message", { status: 400 });
    }

    // Broadcast message to all connected clients via SSE manager
    sseManager.broadcast("message", message);

    return new Response("Message broadcast successfully", { status: 200 });
  } catch (error) {
    console.error("Error broadcasting SSE message:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

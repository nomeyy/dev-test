/**
 * @fileoverview SSE Trigger API Endpoint
 *
 * This endpoint allows sending individual messages to specific users via SSE.
 * It demonstrates how backend modules can integrate with the SSE manager
 * to send targeted notifications without managing SSE protocol details.
 *
 * Usage:
 * POST /api/sse/trigger
 * Body: { userId: string, message: string }
 *
 * This endpoint is used by the SSE client component for testing
 * individual message sending functionality.
 */

import type { NextRequest } from "next/server";
import { sseManager } from "@/lib/sse";

/**
 * POST handler for triggering individual SSE messages
 *
 * Accepts a userId and message, then sends the message to that specific user
 * via the SSE manager. This demonstrates how other parts of the application
 * can send SSE events without managing connection details.
 *
 * @param req - NextRequest containing userId and message in JSON body
 * @returns Response indicating success or failure
 *
 * @example
 * ```typescript
 * // Send message to specific user
 * await fetch('/api/sse/trigger', {
 *   method: 'POST',
 *   body: JSON.stringify({ userId: 'user123', message: 'Hello!' })
 * });
 * ```
 */
export async function POST(req: NextRequest) {
  try {
    // Parse request body with proper typing
    const body = (await req.json()) as { userId: string; message: string };
    const { userId, message } = body;

    // Validate required fields
    if (!userId || !message) {
      return new Response("Missing userId or message", { status: 400 });
    }

    // Send message to specific user via SSE manager
    sseManager.send(userId, "message", message);

    return new Response("Message sent successfully", { status: 200 });
  } catch (error) {
    console.error("Error sending SSE message:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

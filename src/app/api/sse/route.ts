/**
 * @fileoverview Server-Sent Events (SSE) API Endpoint
 *
 * This endpoint establishes and maintains SSE connections with clients.
 * It handles connection lifecycle, implements heartbeat mechanism, and
 * integrates with the centralized SSE manager for event distribution.
 *
 * Features:
 * - Accepts client connections and maintains open streams
 * - Implements heartbeat/ping mechanism to keep connections alive
 * - Handles client disconnects with proper resource cleanup
 * - Integrates with centralized SSE manager for event distribution
 * - Provides error handling and connection state management
 *
 * Client Usage:
 * ```javascript
 * const eventSource = new EventSource('/api/sse?userId=user123');
 *
 * eventSource.addEventListener('message', (event) => {
 *   console.log('Received:', event.data);
 * });
 *
 * eventSource.addEventListener('ping', (event) => {
 *   console.log('Ping received at:', new Date(parseInt(event.data)));
 * });
 * ```
 */

import type { NextRequest } from "next/server";
import { sseManager } from "@/lib/sse";

/**
 * Force dynamic rendering to ensure this route is not cached
 * Required for streaming responses and real-time SSE connections
 */
export const dynamic = "force-dynamic";

/**
 * GET handler for SSE connections
 *
 * Establishes a persistent SSE connection with the client and:
 * - Validates required userId parameter
 * - Creates a ReadableStream for real-time data transmission
 * - Registers the connection with the SSE manager
 * - Implements heartbeat mechanism to keep connection alive
 * - Handles connection cleanup on disconnect or error
 *
 * @param req - NextRequest object containing query parameters
 * @returns Promise<Response> - Streaming response with SSE headers
 *
 * @example
 * ```typescript
 * // Client connects to: GET /api/sse?userId=user123
 * // Server establishes persistent connection and sends events
 * ```
 */
export async function GET(req: NextRequest): Promise<Response> {
  // Extract userId from query parameters
  const userId = req.nextUrl.searchParams.get("userId");

  // Validate required userId parameter
  if (!userId) {
    return new Response("Missing userId", { status: 400 });
  }

  // Create text encoder for converting strings to Uint8Array
  const encoder = new TextEncoder();

  /**
   * Create ReadableStream for SSE data transmission
   * This stream will remain open and send events to the client
   */
  const stream = new ReadableStream<Uint8Array>({
    /**
     * Stream start handler - called when client connects
     * Sets up the SSE connection and registers with the manager
     *
     * @param controller - ReadableStream controller for sending data
     */
    start(controller: ReadableStreamDefaultController<Uint8Array>) {
      /**
       * Helper function to send SSE events to the client
       * Formats data according to SSE protocol: "event: name\ndata: payload\n\n"
       *
       * @param event - Event name (e.g., 'message', 'ping', 'notification')
       * @param data - Event payload (string, number, or object)
       */
      const send = (event: string, data: string | number | object) => {
        const payload = typeof data === "string" ? data : JSON.stringify(data);
        const formatted = `event: ${event}\ndata: ${payload}\n\n`;
        controller.enqueue(encoder.encode(formatted));
      };

      // Send initial connection confirmation
      send("connect", `Connected as ${userId}`);

      // Register this connection with the SSE manager
      // This allows other parts of the application to send events to this user
      sseManager.connect(userId, controller);

      /**
       * Heartbeat mechanism to keep connection alive
       * Sends ping events every 10 seconds to prevent timeouts
       * Many proxies and load balancers close idle connections after 30-60 seconds
       */
      const intervalId = setInterval(() => {
        send("ping", Date.now());
      }, 10000); // 10 seconds

      /**
       * Handle connection cleanup when client disconnects
       * This is triggered when the client closes the connection or navigates away
       */
      req.signal.addEventListener("abort", () => {
        // Clear the heartbeat interval to prevent memory leaks
        clearInterval(intervalId);

        // Remove the connection from the SSE manager
        sseManager.disconnect(userId);

        // Close the stream controller
        controller.close();
      });
    },
  });

  /**
   * Return streaming response with SSE headers
   * These headers are required for proper SSE functionality:
   * - Content-Type: text/event-stream - Tells client this is an SSE stream
   * - Cache-Control: no-cache - Prevents caching of the stream
   * - Connection: keep-alive - Maintains persistent connection
   */
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

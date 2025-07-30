import { NextRequest } from "next/server";

/**
 * Basic SSE endpoint that accepts client connections and maintains open streams
 * This is the foundation for our real-time notification system
 */
export async function GET(request: NextRequest) {
  console.log("SSE: New client connection attempt");

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      console.log("SSE: Stream started for client");

      // Send initial connection confirmation
      const encoder = new TextEncoder();
      const initialMessage = `data: ${JSON.stringify({
        type: "connection",
        message: "Connected to SSE stream",
        timestamp: new Date().toISOString(),
      })}\n\n`;

      controller.enqueue(encoder.encode(initialMessage));

      // Send a test message after 2 seconds
      const testTimeout = setTimeout(() => {
        const testMessage = `data: ${JSON.stringify({
          type: "test",
          message: "This is a test message from the server",
          timestamp: new Date().toISOString(),
        })}\n\n`;

        try {
          controller.enqueue(encoder.encode(testMessage));
          console.log("SSE: Test message sent to client");
        } catch (error) {
          console.error("SSE: Error sending test message:", error);
        }
      }, 2000);

      // Clean up on close
      request.signal.addEventListener("abort", () => {
        console.log("SSE: Client disconnected");
        clearTimeout(testTimeout);
        try {
          controller.close();
        } catch (error) {
          console.error("SSE: Error closing controller:", error);
        }
      });
    },
  });

  // Return SSE response with proper headers
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
}

import { auth } from "@/features/auth/handlers";
import { sseManager } from "@/features/notifications";

export const dynamic = "force-dynamic";

/**
 * SSE endpoint for client connections. Handles connection lifecycle, heartbeats, and cleanup.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  const userId = session.user.id;
  let cleanup: () => void;
  let heartbeatInterval: NodeJS.Timeout;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      cleanup = sseManager.registerConnection(userId, controller);

      heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(":keepalive\n\n"));
        } catch {
          console.log(
            `[SSE] Could not send heartbeat to user ${userId}, client likely disconnected.`,
          );
          clearInterval(heartbeatInterval);
        }
      }, 15000);

      // initial connected event
      const initialMessage = encoder.encode(
        `event: connected\ndata: ${JSON.stringify({
          message: "SSE connection established",
        })}\n\n`,
      );
      controller.enqueue(initialMessage);
    },
    cancel() {
      // cleanup
      if (cleanup) {
        cleanup();
      }
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      console.log(
        `[SSE] Connection cancelled for user: ${userId}. Cleaned up resources.`,
      );
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

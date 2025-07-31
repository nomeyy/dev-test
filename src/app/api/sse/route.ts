import { type NextRequest } from "next/server";
import { sseManager } from "@/lib/sse";
import { logger } from "@/utils/logging";
import { SSE_CONFIG } from "@/lib/sse/constants";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const encoder = new TextEncoder();
    let clientId: string;

    // Create ReadableStream for SSE
    const stream = new ReadableStream({
      start(controller) {
        // Use SSE Manager's unique client ID generation instead of crypto.randomUUID()
        clientId = sseManager.generateUniqueClientId();
        const userId = req.headers.get("x-user-id") || undefined;

        // Create a compatible writer that works with both ReadableStream and SSE manager
        const writer = {
          write: (chunk: Uint8Array | string) => {
            try {
              const data =
                typeof chunk === "string" ? encoder.encode(chunk) : chunk;
              controller.enqueue(data);
            } catch (error) {
              logger.error(SSE_CONFIG.LOGGER.PREFIX, "Write error", error);
            }
          },
          close: () => {
            try {
              controller.close();
            } catch (error) {
              logger.error(SSE_CONFIG.LOGGER.PREFIX, "Close error", error);
            }
          },
          end: () => {
            try {
              controller.close();
            } catch (error) {
              logger.error(SSE_CONFIG.LOGGER.PREFIX, "End error", error);
            }
          },
        };

        // Register client with SSE manager
        sseManager.addClient({
          id: clientId,
          userId,
          response: writer as any,
          isAlive: true,
        });

        // Send initial connection message
        writer.write(
          `data: ${JSON.stringify({
            type: SSE_CONFIG.EVENTS.CONNECTION,
            message: SSE_CONFIG.MESSAGES.CONNECTED,
            clientId: clientId,
          })}\n\n`,
        );
      },
      cancel() {
        if (clientId) {
          sseManager.removeClient(clientId);
        }
      },
    });

    // Set SSE headers
    const headers = new Headers({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    });

    return new Response(stream, { headers });
  } catch (error) {
    logger.error(SSE_CONFIG.LOGGER.PREFIX, "SSE endpoint error", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

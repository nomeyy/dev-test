import type { NextRequest } from "next/server";
import { SseManager } from "@/lib/sse/manager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId") ?? "anon";
  const userId = url.searchParams.get("userId") ?? undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const connection = SseManager.addConnection({
        clientId,
        userId,
        enqueue: (chunk) => controller.enqueue(chunk),
        close: () => controller.close(),
      });

      const heartbeat = SseManager.startHeartbeat(connection.connectionId);

      const cleanup = () => {
        clearInterval(heartbeat);
        SseManager.removeConnection(connection.connectionId);
        try {
          controller.close();
        } catch {}
      };

      const signal: AbortSignal = req.signal as unknown as AbortSignal;
      signal.addEventListener("abort", cleanup, { once: true });
    },
    cancel() {
      
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
} 
import { NextRequest } from "next/server";
import { sseManager } from "@/features/sse";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("id") || crypto.randomUUID();

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const res = {
        write: (chunk: string) => controller.enqueue(encoder.encode(chunk)),
        on: () => {}, // no-op for ReadableStream
      };
      sseManager.addClient(clientId, res as any);
      // Initial handshake
      res.write(`event: connected\ndata: {}\n\n`);
    },
    cancel() {
      sseManager.removeClient(clientId);
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

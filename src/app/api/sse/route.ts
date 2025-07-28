import { NextRequest } from "next/server";
import { sseManager } from "@/utils/sse-manager";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return new Response("Missing userId", { status: 400 });
  }

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  function writeEvent(event: string, data: any) {
    writer.write(
      encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
    );
  }

  // Initial handshake
  writeEvent("connected", "Connected to SSE");

  sseManager.addClient(userId, {
    write: (payload: string) => writer.write(encoder.encode(payload)),
    close: () => writer.close(),
  });

  const heartbeat = setInterval(() => {
    writer.write(encoder.encode(`event: ping\ndata: ${Date.now()}\n\n`));
  }, 15000);

  req.signal.addEventListener("abort", () => {
    clearInterval(heartbeat);
    sseManager.removeClient(userId);
    writer.close();
  });

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

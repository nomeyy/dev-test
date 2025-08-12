import { NextRequest } from "next/server";
import SSEManager from "@/lib/sse";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("id");
  if (!userId) {
    return new Response(JSON.stringify({ error: "Missing user id" }), {
      status: 400,
    });
  }

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();
  const write = (text: string) => writer.write(encoder.encode(text));

  // retry on disconnect
  write("retry: 10000\n");

  const client = {
    write: async (chunk: string) => write(chunk),
    end: () => writer.close(),
    id: userId,
  };

  SSEManager.addClient(userId, client);

  // send connected message once
  write(`event: connected\n`);
  write(`data: ${JSON.stringify({ message: "connected" })}\n\n`);

  // heartbeat
  const heartbeat = setInterval(() => {
    write(`event: ping\n`);
    write(`data: ${JSON.stringify({ time: Date.now() })}\n\n`);
  }, 15000);

  req.signal.addEventListener("abort", () => {
    clearInterval(heartbeat);
    SSEManager.removeClient(userId, client);
    writer.close();
  });

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

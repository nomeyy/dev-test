import { NextRequest } from "next/server";
import { addClient, removeClient } from "@/lib/sse/sseManager";

export async function GET(request: NextRequest) {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId") || "";

  addClient(clientId, writer);

  writer.write(
    new TextEncoder().encode(
      `event: connected\ndata: {"id": "${clientId}"}\n\n`,
    ),
  );

  const heartbeat = setInterval(() => {
    writer.write(new TextEncoder().encode(`event: ping\ndata: {}\n\n`));
  }, 15000);

  request.signal.addEventListener("abort", () => {
    clearInterval(heartbeat);
    removeClient(clientId);
    writer.close();
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

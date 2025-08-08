// app/api/sse/route.ts
import {
  addClient,
  removeClient,
  init,
  broadcastClientList,
} from "@/lib/sseManager";
import type { SSEClient } from "@/lib/sseManager";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId") || Date.now().toString();
  const username = searchParams.get("username") || "Anonymous";

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  // define the client
  const client: SSEClient = {
    username,
    send: (event, data) => {
      try {
        writer.write(encoder.encode(`event: ${event}\n`));
        writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      } catch (err) {
        console.error(`[${clientId}] Failed to send event`, err);
      }
    },
    close: () => {
      try {
        writer.close();
      } catch (err) {
        console.warn(`[${clientId}] Stream close error:`, err);
      }
    },
  };

  init();
  addClient(clientId, client);
  broadcastClientList();

  // cleanup on disconnect
  req.signal.addEventListener("abort", () => {
    removeClient(clientId);
    client.close(); // safe-close in one place
  });

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

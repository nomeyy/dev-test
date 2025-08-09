import type { NextRequest } from "next/server";

import { sseManager } from "@/lib/sse";
import type { Client } from "@/lib/sse/types";
import { encodeSSE } from "../route";
import { logToFile } from "@/lib/sse/logger";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("id") || crypto.randomUUID();
  const userId = searchParams.get("userId") || undefined;
  const name = searchParams.get("name") || `Session-${clientId}`;

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const client: Client = {
    id: clientId,
    name,
    userId,
    res: writer,
    status: "connected",
    subscriptions: new Set(),
  };

  sseManager.addClient(client);

  req.signal.addEventListener("abort", async () => {
    sseManager.removeClient(clientId);
    logToFile(`DISCONNECTED: ${client.name} (${client.id})`);
  });

  try {
    writer.write(
      encodeSSE("message", {
        event: "connect",
        payload: "Connected to event stream!",
      }),
    );
  } catch (err) {
    logToFile(
      `ERROR on connect for ${client.name} (${client.id}): ${String(err)}`,
    );
  }

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

import sseManager from "@/lib/sse/sseManager";
import { NextRequest } from "next/server";

function createConnection(
  clientId: string,
  controller: ReadableStreamDefaultController,
) {
  const encoder = new TextEncoder();
  let closed = false;

  function sendRaw(str: string) {
    if (closed) return;
    try {
      controller.enqueue(encoder.encode(str));
    } catch (e) {
      closed = true;
      throw e;
    }
  }

  function send(msg: {
    event?: string;
    data?: unknown;
    id?: string;
    retry?: number;
  }) {
    const event = msg.event ? `event: ${msg.event}\n` : "";
    const id = msg.id ? `id: ${msg.id}\n` : "";
    const retry = typeof msg.retry === "number" ? `retry: ${msg.retry}\n` : "";
    let data = "";
    if (typeof msg.data === "string") data = msg.data;
    else if (msg.data !== undefined) data = JSON.stringify(msg.data);
    const dataLines = data
      .split("\n")
      .map((l) => `data: ${l}\n`)
      .join("");
    const txt = `${id}${event}${retry}${dataLines}\n`;
    sendRaw(txt);
  }

  function close() {
    if (closed) return;
    closed = true;
    try {
      controller.close();
    } catch (e) {}
  }

  return { send, sendRaw, close };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId") ?? "anonymous";

  const stream = new ReadableStream({
    start(controller) {
      const connObj = createConnection(clientId, controller);

      const connection = {
        id: `${clientId}:${Math.random().toString(36).slice(2, 9)}`,
        clientId,
        send: (chunk: string) => connObj.sendRaw(chunk),
        close: () => connObj.close(),
      };

      sseManager.subscribe(clientId, connection);

      const heartbeat = setInterval(() => {
        connObj.send({ event: "ping", data: { t: new Date().toISOString() } });
      }, 25_000);

      connObj.send({
        event: "message",
        data: { text: `Hello ${clientId}`, sentAt: new Date().toISOString() },
      });

      const onAbort = () => {
        sseManager.unsubscribe(clientId, connection);
        clearInterval(heartbeat);
      };

      req.signal.addEventListener("abort", onAbort);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

import { NextRequest } from "next/server";
import { sseEmitter } from "./sse-emitter";

function encodeSSE(event: string, data: any) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export const GET = async (req: NextRequest) => {
  let heartbeat: NodeJS.Timeout;
  let onBroadcast: (event: string, data: any) => void;

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encodeSSE("message", { text: "SSE connection established!" }),
      );
      heartbeat = setInterval(() => {
        controller.enqueue(encodeSSE("ping", {}));
      }, 20000);

      onBroadcast = (event: string, data: any) => {
        controller.enqueue(encodeSSE(event, data));
      };
      sseEmitter.on("broadcast", onBroadcast);
    },
    cancel() {
      clearInterval(heartbeat);
      if (onBroadcast) sseEmitter.off("broadcast", onBroadcast);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};

export const POST = async (req: NextRequest) => {
  const { event, data } = await req.json();
  sseEmitter.emit("broadcast", event, data);
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};

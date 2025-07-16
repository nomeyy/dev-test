import { sseManager } from "@/lib/sseManager";
import { NextRequest } from "next/server";

export function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = params.id;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const write = (data: string) => controller.enqueue(encoder.encode(data));
      const close = () => controller.close();
      sseManager.addClient(userId, { write, close });

      const heartbeat = setInterval(() => {
        write(`event: ping\ndata: {}\n\n`);
      }, 15000);

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        sseManager.removeClient(userId);
        close();
      });
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

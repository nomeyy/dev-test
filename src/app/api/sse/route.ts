
import { addClient, removeClient } from "@/lib/sseManager";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return new Response("Missing userId", { status: 400 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (message: string) => {
        controller.enqueue(encoder.encode(message));
      };


      addClient(userId, send);
      console.log(`👤 User ${userId} connected`);

      send(`event: connected\ndata: ${JSON.stringify({ connected: true })}\n\n`);

  
      const interval = setInterval(() => {
        send(`event: ping\ndata: {}\n\n`);
      }, 15000);

      req.signal.addEventListener("abort", () => {
        console.log(`❌ User ${userId} disconnected`);
        clearInterval(interval);
        removeClient(userId);
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

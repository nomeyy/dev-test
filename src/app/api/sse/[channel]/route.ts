import { registerClient, unregisterClient } from "@/lib/sse";

export async function GET(
  req: Request,
  context: { params: Promise<{ channel: string }> },
) {
  const { channel } = await context.params;

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  const sseClient = {
    write: (data: string) => {
      void writer.write(encoder.encode(data));
    },
  };

  registerClient(channel, sseClient);

  sseClient.write(`event: init\ndata: connected\n\n`);

  const heartbeat = setInterval(() => {
    sseClient.write(":\n\n");
  }, 15000);

  req.signal.addEventListener("abort", () => {
    clearInterval(heartbeat);
    unregisterClient(channel, sseClient);
    void writer.close();
  });

  return new Response(stream.readable, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

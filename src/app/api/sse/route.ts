import { NextRequest } from "next/server";
import { sseManager } from "@/features/shared/services";

// Helper to get a unique client ID (e.g., from session, user, or fallback to random)
function getClientId(req: NextRequest): string {
  return (
    req.headers.get("x-client-id") ||
    Math.random().toString(36).substring(2, 15)
  );
}

export async function GET(req: NextRequest) {
  const { readable, writable } = new TransformStream();
  const clientId = getClientId(req);

  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  writer.write(
    encoder.encode(
      `event: connected\ndata: {"message":"SSE connection established"}\n\n`,
    ),
  );

  const heartbeat = setInterval(() => {
    writer.write(encoder.encode(`event: ping\ndata: {}\n\n`));
  }, 25000);

  // Handle disconnects using the request's signal
  req.signal?.addEventListener("abort", () => {
    clearInterval(heartbeat);
    writer.close();
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

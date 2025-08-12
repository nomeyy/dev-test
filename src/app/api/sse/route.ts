import { sseManager } from "../../../../lib/sseManager";
import { randomUUID } from "crypto";
import { type NextRequest } from "next/server";
import { getSession } from "@/features/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    const connectionId = randomUUID();

    sseManager.addClient(
      session.user.id,
      writer as WritableStreamDefaultWriter<Uint8Array>,
      {
        connectionId,
        enableHeartbeat: true,
      },
    );

    const encoder = new TextEncoder();
    void writer.write(encoder.encode("retry: 10000\n\n"));
    void writer.write(
      encoder.encode(
        `event: connected\n` +
          `data: ${JSON.stringify({ connectionId, userId: session.user.id })}\n\n`,
      ),
    );

    req.signal.addEventListener("abort", () => {
      sseManager.removeConnection(connectionId);
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch {
    return new Response(
      JSON.stringify({ error: "SSE initialization failed" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

import { auth } from "@/features/auth/handlers";
import { sseManager } from "@/server/sse/sse-manager";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      console.warn("❌ Unauthorized SSE request");
      return new Response("Unauthorized", { status: 401 });
    }
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const client = sseManager.connect(userId, writer);
    console.log("🧠 Client connected via EventSource:", userId);
    writer.write(
      new TextEncoder().encode(
        `event: after_connect_event\ndata: {"message": "👋 Connected!"}\n\n`,
      ),
    );

    req.signal.addEventListener("abort", () => {
      sseManager.disconnect(client.userId);
    });

    writer.write(new TextEncoder().encode(": connected\n\n"));

    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("❌ SSE route error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}

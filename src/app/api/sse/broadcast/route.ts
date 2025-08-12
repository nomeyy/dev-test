import { broadcastEvent } from "@/features/sse";

export const runtime = "nodejs";
// Endpoint created for testing
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      message?: string;
      event?: string;
    } | null;
    const message = body?.message ?? `Broadcast at ${new Date().toISOString()}`;
    const event = body?.event ?? "message";
    const delivered = broadcastEvent(event, { text: message });
    return Response.json({ ok: true, delivered });
  } catch (error) {
    console.error("[SSE] Broadcast error", error);
    return new Response("Internal Error", { status: 500 });
  }
}

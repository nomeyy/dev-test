import { broadcastSSE } from "@/server/sse/send-event";

export async function POST() {
  try {
    broadcastSSE("test_event", { message: "🔥 Broadcast from server!" });
    return new Response("✅ Broadcast Sent", { status: 200 });
  } catch (e) {
    console.error("❌ Broadcast failed:", e);
    return new Response("Broadcast error", { status: 500 });
  }
}

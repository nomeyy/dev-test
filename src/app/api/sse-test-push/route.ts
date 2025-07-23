import { notifyClient } from "@/lib/sse/sseNotify";

export async function GET() {
  notifyClient("test-user-1", "message", { text: "Hello" });
  return Response.json({ ok: true });
}

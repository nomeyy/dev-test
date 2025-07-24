import { broadcast } from "@/lib/sse/sseManager";

export async function POST() {
  broadcast("update", {
    message: "Server says hello at " + new Date().toLocaleTimeString(),
  });
  return Response.json({ success: true });
}

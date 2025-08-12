import { NextRequest } from "next/server";
import SSEManager from "@/lib/sse";

export async function POST(req: NextRequest) {
  const { userId, event, data } = await req.json();

  if (!userId || !event) {
    return new Response(JSON.stringify({ error: "Missing userId or event" }), {
      status: 400,
    });
  }

  await SSEManager.sendEvent(userId, event, data);
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}

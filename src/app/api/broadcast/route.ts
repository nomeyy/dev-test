import { NextRequest } from "next/server";
import SSEManager from "@/lib/sse";

export async function POST(req: NextRequest) {
  try {
    const { event, data } = await req.json();

    if (!event) {
      return new Response(JSON.stringify({ error: "Missing event" }), {
        status: 400,
      });
    }

    await SSEManager.broadcast(event, data);

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error("Broadcast error:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
}

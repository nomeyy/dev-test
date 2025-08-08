import { NextRequest } from "next/server";
import { broadcast, sendToClient } from "@/lib/sseManager";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, event = "notification", clientId } = body;

    if (!message) {
      return new Response("Message is required", { status: 400 });
    }

    if (clientId) {
      const isConnected = sendToClient(clientId, event, { message });
      if (!isConnected) {
        return new Response(`Client ${clientId} not connected`, {
          status: 404,
        });
      }
    } else {
      broadcast(null, event, { message });
    }

    return new Response("Message dispatched", { status: 200 });
  } catch (err) {
    console.error("Dispatch error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}

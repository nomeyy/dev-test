// app/api/send-notification/route.ts
import { SSEManager } from "@/lib/sse";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { clientId, message } = await request.json();

  // Send to specific client
  if (clientId) {
    SSEManager.sendToClient(clientId, "notification", {
      message,
      timestamp: new Date().toISOString(),
    });
  } else {
    // Or broadcast to all
    SSEManager.broadcast("notification", {
      message,
      timestamp: new Date().toISOString(),
    });
  }

  return NextResponse.json({ success: true });
}

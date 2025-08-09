import { NextResponse, type NextRequest } from "next/server";

import { sseManager } from "@/lib/sse";
import { logToFile } from "@/lib/sse/logger";

export async function POST(req: NextRequest) {
  const { targetId, eventName, payload } = await req.json();
  try {
    if (eventName === "broadcast") {
      sseManager.broadcast(eventName || "broadcast", {
        event: eventName || "broadcast",
        payload,
      });
    } else {
      sseManager.sendEvent(targetId, "message", {
        event: eventName || "message",
        payload,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    logToFile(`ERROR Sending ${eventName || "message"}: ${String(err)}`);
  }
}

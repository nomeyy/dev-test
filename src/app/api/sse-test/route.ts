import { NextResponse } from "next/server";
import { sseManager } from "../../../features/sse/SSEManager";

export async function POST() {
  await sseManager.broadcastEvent("test", {
    message: "Hello from server at " + new Date().toISOString(),
  });
  return NextResponse.json({ ok: true });
}

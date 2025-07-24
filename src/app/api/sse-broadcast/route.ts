import type { SSEEvent } from "../../../features/sse/types";
import { sseService } from "../../../features/sse/services/sse-service";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { event, data } = (await req.json()) as {
    event: SSEEvent["event"];
    data: SSEEvent["data"];
  };
  sseService.broadcast({ event, data } as SSEEvent);
  return NextResponse.json({ ok: true });
}

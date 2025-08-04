import { NextRequest, NextResponse } from "next/server";
import { broadcastEvent } from "@/lib/sseManager";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { event, data } = body;

  if (!event || !data) {
    return NextResponse.json({ error: "Missing event or data" }, { status: 400 });
  }

  broadcastEvent(event, data);
  return NextResponse.json({ success: true });
}

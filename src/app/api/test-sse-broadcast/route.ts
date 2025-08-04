import { NextRequest, NextResponse } from "next/server";
import { sseManager } from "@/features/sse";

export async function POST(req: NextRequest) {
  const { message } = await req.json();

  sseManager.broadcastEvent({
    event: "notification",
    data: { message },
  });

  return NextResponse.json({ status: "broadcast sent" });
}

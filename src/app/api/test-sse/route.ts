import { NextRequest, NextResponse } from "next/server";
import { sseManager } from "@/features/sse";

export async function POST(req: NextRequest) {
  const { userId, message } = await req.json();

  sseManager.sendEventToClient(userId, {
    event: "notification",
    data: { message },
  });

  return NextResponse.json({ status: "sent" });
}

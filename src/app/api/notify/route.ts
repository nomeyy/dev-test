import { NextRequest, NextResponse } from "next/server";
import { sendEventToUser } from "@/lib/sseManager";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, message } = body;

  if (!userId || !message) {
    return NextResponse.json({ error: "userId and message are required" }, { status: 400 });
  }

  sendEventToUser(userId, "notification", { text: message });

  return NextResponse.json({ success: true });
}

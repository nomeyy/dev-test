import { NextRequest, NextResponse } from "next/server";
import { sendEventToUser } from "@/lib/sseManager";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, event, data } = body;

  if (!userId || !event || !data) {
    return NextResponse.json({ error: "Missing userId, event, or data" }, { status: 400 });
  }

  sendEventToUser(userId, event, data);
  return NextResponse.json({ success: true });
}

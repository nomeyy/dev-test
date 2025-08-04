
import { NextResponse } from "next/server";
import { broadcastEvent } from "@/lib/sseManager"; // adjust import

export async function POST(req: Request) {
  const body = await req.json();
  const { event, message } = body;

  broadcastEvent(event, { message });

  return NextResponse.json({ status: "sent" });
}

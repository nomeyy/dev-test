import { NextRequest, NextResponse } from "next/server";
import { sendEventToUser } from "@/lib/sseManager";

export async function POST(req: NextRequest) {
  try {
    const { userId, event, data } = await req.json();

    if (!userId || !event) {
      return NextResponse.json({ message: "Missing userId or event" }, { status: 400 });
    }

    sendEventToUser(userId, event, data);

    return NextResponse.json({ message: "Message sent successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error in /api/send:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
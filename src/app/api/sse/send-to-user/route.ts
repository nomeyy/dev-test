import { NextRequest, NextResponse } from "next/server";
import { sendEventToUser } from "../../../../features/sse/utils/sse-utils";
import { auth } from "@/features/auth/handlers";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }
    const { userId, eventType, data, metadata } = await request.json();
    if (!userId || !eventType || !data) {
      return NextResponse.json(
        { error: "Missing required fields: userId, eventType, data" },
        { status: 400 },
      );
    }
    await sendEventToUser(userId, eventType, data, metadata);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

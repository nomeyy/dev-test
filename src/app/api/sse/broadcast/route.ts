import { NextRequest, NextResponse } from "next/server";
import { broadcastEvent } from "../../../../features/sse/utils/sse-utils";
import { auth } from "@/features/auth/handlers";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    // if (!session?.user?.id) {
    //   return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    // }
    const { eventType, data, metadata } = await request.json();
    if (!eventType || !data) {
      return NextResponse.json(
        { error: "Missing required fields: eventType, data" },
        { status: 400 },
      );
    }
    await broadcastEvent(eventType, data, metadata);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

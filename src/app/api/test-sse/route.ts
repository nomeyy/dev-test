import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../features/auth/handlers";
import { sseService } from "../../../features/sse";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { message, timestamp } = body;

    // Send a test notification to the current user
    await sseService.notifyUser(session.user.id, {
      type: "test",
      message: message || "Test notification from API",
      timestamp: timestamp || new Date().toISOString(),
      userId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      message: "Test SSE message sent",
      userId: session.user.id,
    });
  } catch (error) {
    console.error("Error sending test SSE message:", error);
    return NextResponse.json(
      { error: "Failed to send test message" },
      { status: 500 },
    );
  }
}

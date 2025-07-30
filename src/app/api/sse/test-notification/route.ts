import { NextRequest, NextResponse } from "next/server";
import { sendNotificationToClient } from "@/features/sse";

export async function POST(request: NextRequest) {
  try {
    const { clientId, title, message } = await request.json();

    if (!clientId) {
      return NextResponse.json(
        { error: "Client ID is required" },
        { status: 400 },
      );
    }

    // Send notification to the specific client
    const success = await sendNotificationToClient(
      clientId,
      title || "Test Notification",
      message || "This is a test notification",
      "info",
    );

    if (success) {
      return NextResponse.json({
        success: true,
        message: "Notification sent successfully",
      });
    } else {
      return NextResponse.json(
        { error: "Failed to send notification - client may not be connected" },
        { status: 404 },
      );
    }
  } catch (error) {
    console.error("Error sending test notification:", error);
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 },
    );
  }
}

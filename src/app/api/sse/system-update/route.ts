import { NextRequest, NextResponse } from "next/server";
import { broadcast } from "@/features/sse";

export async function POST(request: NextRequest) {
  try {
    const { update, details } = await request.json();

    if (!update) {
      return NextResponse.json(
        { error: "Update message is required" },
        { status: 400 },
      );
    }

    // Broadcast system update to all clients
    broadcast("system_update", {
      update,
      details,
      timestamp: Date.now(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending system update:", error);
    return NextResponse.json(
      { error: "Failed to send system update" },
      { status: 500 },
    );
  }
}

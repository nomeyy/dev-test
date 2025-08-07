// app/api/test-notify/route.ts
import type { NextRequest } from "next/server";
import { broadcast, getClientCount } from "@/lib/sse/sendEvent";

interface NotificationBody {
  message?: string;
  type?: "info" | "success" | "warning" | "error";
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body if it exists
    let customMessage = "🔔 New event from server!";
    let eventType: "info" | "success" | "warning" | "error" = "info";

    try {
      const body = (await request.json()) as NotificationBody;
      if (body.message) customMessage = body.message;
      if (body.type) eventType = body.type;
    } catch {
      // Use default message if no body or invalid JSON
    }

    // Send the notification
    const clientsNotified = broadcast("notification", {
      message: customMessage,
      type: eventType,
      timestamp: Date.now(),
      id: crypto.randomUUID(),
    });

    return Response.json({
      status: "sent",
      message: customMessage,
      clientsNotified,
      totalClients: getClientCount(),
    });
  } catch (error) {
    console.error("❌ Error in test-notify endpoint:", error);
    return Response.json(
      {
        status: "error",
        message: "Failed to send notification",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  // GET endpoint to check connection status
  return Response.json({
    status: "ready",
    connectedClients: getClientCount(),
    timestamp: Date.now(),
  });
}

import { NextRequest } from "next/server";
import { sseManager } from "@/lib/sse/sse-manager";

export async function GET(request: NextRequest) {
  try {
    // Extract user and session info from request
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    const sessionId = url.searchParams.get("sessionId");

    // Register the client and return SSE stream
    return await sseManager.registerClient(
      request,
      userId || undefined,
      sessionId || undefined,
      {
        userAgent: request.headers.get("user-agent"),
        ip:
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip"),
      },
    );
  } catch (error) {
    console.error("SSE connection error:", error);
    return new Response("SSE connection failed", { status: 500 });
  }
}

// Handle client disconnect
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const clientId = url.searchParams.get("clientId");

    if (clientId) {
      sseManager.removeClient(clientId);
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("SSE disconnect error:", error);
    return new Response("Disconnect failed", { status: 500 });
  }
}

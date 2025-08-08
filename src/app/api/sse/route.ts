import { type NextRequest } from "next/server";
import { sseManager } from "@/lib/sse";

export async function GET(request: NextRequest) {
  try {
    // Extract query parameters for user/session identification
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || undefined;
    const sessionId = searchParams.get("sessionId") || undefined;
    const metadata = searchParams.get("metadata")
      ? JSON.parse(searchParams.get("metadata")!)
      : undefined;

    // Register the client with the SSE manager
    const response = sseManager.registerClient(
      request,
      userId,
      sessionId,
      metadata,
    );

    return response;
  } catch (error) {
    console.error("SSE: Error in SSE endpoint:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// Handle preflight requests for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
}

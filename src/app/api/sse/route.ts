import { type NextRequest } from "next/server";
import { auth } from "@/features/auth/handlers";
import { sseServer } from "@/lib/sse/server";

export async function GET(request: NextRequest) {
  try {
    // Get session to identify the user
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Add client to the SSE server with user information
    const connection = sseServer.addClient({
      userId,
      sessionId: session?.user?.id,
    });

    // Handle client disconnect
    request.signal.addEventListener("abort", () => {
      sseServer.removeClient(connection.clientId);
    });

    return connection.response;
  } catch (error) {
    console.error("SSE: Error setting up connection:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Cache-Control",
    },
  });
}

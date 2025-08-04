import { NextRequest } from "next/server";
import { getSSEManager } from "@/features/sse";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const sseManager = getSSEManager();
    const connections = sseManager.getActiveConnections();

    return new Response(JSON.stringify(connections, null, 2), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error fetching SSE connections:", error);
    return new Response("Internal Server Error", {
      status: 500,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }
}

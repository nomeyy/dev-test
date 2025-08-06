import { type NextRequest } from "next/server";
import { auth } from "@/features/auth/handlers";
import { sseServer } from "@/lib/sse/server";
import type { SSEEventType } from "@/lib/sse/types";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = (await request.json()) as {
      event: SSEEventType;
      data: unknown;
    };
    const { event, data } = body;

    if (!event || !data) {
      return new Response("Missing event or data", { status: 400 });
    }

    // Broadcast message to all connected clients
    const sentCount = sseServer.broadcast(event, data);

    return new Response(
      JSON.stringify({
        success: true,
        sentCount,
        message: "Message broadcast successfully",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("Error broadcasting message:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

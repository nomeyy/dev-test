import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/features/auth/handlers";

// Simple in-memory store for connected clients
const clients = new Map<
  string,
  {
    userId?: string;
    controller: ReadableStreamDefaultController;
    lastHeartbeat: number;
  }
>();

export async function GET(request: NextRequest) {
  const session = await auth();
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Extract client-specific ID from query params if provided
  const { searchParams } = new URL(request.url);
  const customClientId = searchParams.get("clientId");

  const stream = new ReadableStream({
    start(controller) {
      // Store client connection with custom client ID if provided
      const finalClientId = customClientId || clientId;
      clients.set(finalClientId, {
        userId: session?.user?.id,
        controller,
        lastHeartbeat: Date.now(),
      });

      // Send initial message
      const message = `data: ${JSON.stringify({ event: "connected", clientId: finalClientId })}\n\n`;
      controller.enqueue(new TextEncoder().encode(message));

      // Start heartbeat for this client
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeatMessage = `data: ${JSON.stringify({ event: "heartbeat", timestamp: Date.now() })}\n\n`;
          controller.enqueue(new TextEncoder().encode(heartbeatMessage));
          // Update last heartbeat
          const client = clients.get(clientId);
          if (client) {
            client.lastHeartbeat = Date.now();
          }
        } catch (error) {
          // Client disconnected, cleanup
          clearInterval(heartbeatInterval);
          clients.delete(clientId);
        }
      }, 10000); // Send heartbeat every 15 seconds

      // Handle disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeatInterval);
        clients.delete(finalClientId);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    target?: string;
    targetId?: string;
    event: string;
    data: Record<string, unknown>;
  };
  const { target = "all", targetId, event, data } = body;
  let sentCount = 0;

  for (const [clientId, client] of clients) {
    let shouldSend = false;

    switch (target) {
      case "all":
        shouldSend = true;
        break;
      case "user":
        shouldSend = client.userId === targetId;
        break;
      case "client":
        shouldSend = clientId === targetId;
        break;
    }

    if (shouldSend) {
      try {
        const message = `data: ${JSON.stringify({ event, data, timestamp: Date.now() })}\n\n`;
        client.controller.enqueue(new TextEncoder().encode(message));
        sentCount++;
      } catch {
        // Remove disconnected client
        clients.delete(clientId);
      }
    }
  }

  return NextResponse.json({ success: true, sentCount });
}

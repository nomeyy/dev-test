import { getSession } from "@/features/auth";
import { sseService } from "@/features/sse";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Get query parameters
  const session = await getSession();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") ?? session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 404 });
  }

  try {
    // Create Page connection
    const connection = await sseService.connect({ userId });
    const responseOptions = {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control",
      },
    };

    const initMessage = (controller: ReadableStreamDefaultController) => {
      // Send initial connection event
      const event = `data: ${JSON.stringify({
        type: "connected",
        data: {
          connectionId: connection.id,
          timestamp: new Date().toISOString(),
        },
      })}\n\n`;

      controller.enqueue(new TextEncoder().encode(event));
    };

    const addHeartbeat = (controller: ReadableStreamDefaultController) => {
      // Keep connection alive with heartbeat
      const heartbeat = setInterval(() => {
        try {
          const heartbeatEvent = `data: ${JSON.stringify({
            type: "heartbeat",
            data: { timestamp: new Date().toISOString() },
          })}\n\n`;

          controller.enqueue(new TextEncoder().encode(heartbeatEvent));

          // Update last activity on heartbeat
          void sseService.updateConnection(connection.id, {
            lastActivity: new Date(),
          });
        } catch (error) {
          console.error(
            `Heartbeat error for connection ${connection.id}:`,
            error,
          );
          // If heartbeat fails, disconnect the client
          void sseService.forceDisconnect(connection.id);
        }
      }, 30000); // 30 seconds

      // Store heartbeat for proper cleanup
      sseService.addConnectionHeartbeat(connection.id, heartbeat);

      return heartbeat;
    };

    const stream = new ReadableStream({
      start(controller) {
        initMessage(controller);
        addHeartbeat(controller);

        sseService.addController(connection.id, controller);

        // Cleanup on close
        request.signal.addEventListener("abort", () => {
          console.log(`SSE connection ${connection.id} aborted by client`);
          void sseService.disconnect(connection.id);
          controller.close();
        });
      },
      cancel() {
        console.log(`SSE connection ${connection.id} cancelled`);
        void sseService.disconnect(connection.id);
      },
    });

    // Set Page headers
    return new NextResponse(stream, responseOptions);
  } catch (error) {
    console.error("Page connection error:", error);
    return NextResponse.json(
      { error: "Failed to establish Page connection" },
      { status: 500 },
    );
  }
}

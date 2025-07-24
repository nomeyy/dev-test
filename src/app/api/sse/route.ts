import { auth } from "@/features/auth/handlers";
import { SSEManager } from "@/features/sse";
import { type NextRequest } from "next/server";
import { headers } from "next/headers";
import { randomUUID } from "crypto";

const DEFAULT_HEARTBEAT_INTERVAL = parseInt(
  process.env.SSE_HEARTBEAT_INTERVAL || "300000",
  10,
);

// Global SSE manager instance
let sseManager: SSEManager | null = null;
// Global map of clientId to stream controller for event delivery
export const sseClientStreams = new Map();

function getSSEManager(): SSEManager {
  if (!sseManager) {
    sseManager = new SSEManager({
      heartbeatInterval: DEFAULT_HEARTBEAT_INTERVAL,
      connectionTimeout: 300000, // 2 minutes
      maxConnections: 1000,
      enableRedis: false, // TODO: Enable when Redis integration is implemented
      enableLogging: true,
      enableMetrics: true,
    });
  }
  return sseManager;
}

/**
 * SSE API route handler
 * Supports reconnection by allowing client to provide a clientId via header or query param.
 */
export async function GET(request: NextRequest) {
  console.log("🔌 SSE Connection Request Received");
  try {
    // Get authentication session
    const session = await auth();
    if (!session?.user?.id) {
      console.log("🔒 SSE connection denied: user not authenticated");
      return new Response("Authentication required", { status: 401 });
    }
    console.log("👤 Auth Session:", {
      userId: session?.user?.id,
      email: session?.user?.email,
      isAuthenticated: !!session?.user,
    });
    // Get client information
    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || "unknown";
    const ipAddress =
      headersList.get("x-forwarded-for") ||
      headersList.get("x-real-ip") ||
      "unknown";
    // --- Reconnection logic ---
    // Prefer client-provided clientId (header or query param), else generate new
    let clientId = headersList.get("x-client-id") || undefined;
    if (!clientId) {
      const url = new URL(request.url);
      clientId = url.searchParams.get("clientId") || undefined;
    }
    if (!clientId) {
      clientId = randomUUID();
    }
    const sessionId = session?.user?.id || randomUUID();
    console.log("🆔 Client Info:", {
      clientId,
      sessionId,
      userAgent: userAgent.substring(0, 50) + "...",
      ipAddress,
    });
    // Create SSE manager instance
    const manager = getSSEManager();
    console.log("📊 SSE Manager Stats:", manager.getStats());
    // Register client (if already exists, disconnect old one first)
    const existing = manager.getClient(clientId);
    if (existing) {
      console.log(
        "♻️ Reconnection detected, cleaning up old client:",
        clientId,
      );
      await manager.disconnectClient(clientId);
    }
    await manager.connectClient({
      id: clientId,
      userId: session?.user?.id,
      sessionId,
      userAgent,
      ipAddress,
      groups: new Set([
        session?.user?.id ? `user:${session.user.id}` : "anonymous",
        "all",
      ]),
    });
    console.log("✅ Client registered successfully");
    console.log("📊 Updated SSE Manager Stats:", manager.getStats());
    // Set SSE headers
    const responseHeaders = new Headers({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*", // TODO: Configure based on environment
      "Access-Control-Allow-Methods": "GET",
      "Access-Control-Allow-Headers": "Cache-Control, X-Client-Id",
      "X-Client-ID": clientId,
      "X-Heartbeat-Interval": String(DEFAULT_HEARTBEAT_INTERVAL),
    });
    // Create readable stream for SSE
    const stream = new ReadableStream({
      start(controller) {
        console.log("🌊 SSE Stream Started for client:", clientId);
        // Register the controller for this clientId
        sseClientStreams.set(clientId, controller);
        // Send initial connection event
        const connectionEvent = {
          type: "connection",
          data: {
            clientId,
            userId: session?.user?.id,
            timestamp: Date.now(),
          },
          metadata: {
            source: "sse-api",
            priority: "normal",
          },
        };
        // Format SSE event
        const sseData = `event: ${connectionEvent.type}\ndata: ${JSON.stringify(connectionEvent.data)}\n\n`;
        controller.enqueue(new TextEncoder().encode(sseData));
        console.log("📤 Sent connection event:", connectionEvent.data);
        (controller as any).clientId = clientId;
        (controller as any).manager = manager;
        // Handle client disconnect
        request.signal.addEventListener("abort", async () => {
          console.log("🔌 Client disconnect detected:", clientId);
          try {
            await manager.disconnectClient(clientId);
            console.log("✅ Client disconnected successfully:", clientId);
          } catch (error) {
            console.error(`❌ Error disconnecting client ${clientId}:`, error);
          }
        });
        // Send periodic heartbeat
        const heartbeatInterval = setInterval(() => {
          try {
            const heartbeatData = `event: heartbeat\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`;
            controller.enqueue(new TextEncoder().encode(heartbeatData));
            console.log(
              `💓 Sent heartbeat to client: ${clientId} (interval: ${DEFAULT_HEARTBEAT_INTERVAL}ms)`,
            );
          } catch (error) {
            console.error(
              `❌ Error sending heartbeat to client ${clientId}:`,
              error,
            );
            clearInterval(heartbeatInterval);
          }
        }, DEFAULT_HEARTBEAT_INTERVAL); // configurable interval
        // Cleanup on stream close
        const cleanup = () => {
          console.log("🧹 Starting cleanup for client:", clientId);
          clearInterval(heartbeatInterval);
          sseClientStreams.delete(clientId);
          try {
            manager.disconnectClient(clientId);
            console.log("✅ Cleanup completed for client:", clientId);
          } catch (error) {
            console.error(
              `❌ Error during cleanup for client ${clientId}:`,
              error,
            );
          }
        };
        request.signal.addEventListener("abort", cleanup);
      },
      cancel() {
        console.log("🚫 Stream cancelled for client:", clientId);
        sseClientStreams.delete(clientId);
        try {
          manager.disconnectClient(clientId);
          console.log(
            "✅ Stream cancellation cleanup completed for client:",
            clientId,
          );
        } catch (error) {
          console.error(
            `❌ Error during stream cancellation for client ${clientId}:`,
            error,
          );
        }
      },
    });
    console.log("🚀 SSE Response created successfully for client:", clientId);
    return new Response(stream, {
      headers: responseHeaders,
      status: 200,
    });
  } catch (error) {
    console.error("❌ SSE connection error:", error);
    if (error instanceof Error && error.name === "SSEManagerError") {
      const sseError = error as any;
      console.log("🚨 SSE Manager Error:", {
        type: sseError.type,
        code: sseError.code,
      });
      if (
        sseError.type === "connection_failed" &&
        sseError.code === "SSE_MAX_CONNECTIONS"
      ) {
        console.log("📊 Max connections reached, returning 503");
        return new Response("Maximum connections reached", { status: 503 });
      }
      if (sseError.type === "authentication_failed") {
        console.log("🔐 Authentication failed, returning 401");
        return new Response("Authentication required", { status: 401 });
      }
    }
    console.log("💥 Generic error, returning 500");
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*", // TODO: Configure based on environment
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers":
        "Cache-Control, Content-Type, X-Client-Id",
      "Access-Control-Max-Age": "86400",
    },
  });
}

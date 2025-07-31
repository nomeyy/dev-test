import { NextRequest } from "next/server";
import { getSession } from "@/features/auth";
import { getSSEManager } from "@/lib/sse/manager";
import {
  generateConnectionId,
  formatSSEMessage,
  SSERedisKeys,
} from "@/lib/sse/utils";
import { SSEEventType } from "@/lib/sse/types";
import { getRedis } from "@/lib/redis";
import { RedisService } from "@/features/redis";
import { createServiceContext } from "@/utils/service-utils";

// Create service context for logging
const { log, handleError } = createServiceContext("SSEEndpoint");

/**
 * SSE endpoint for establishing Server-Sent Events connections
 * GET /api/sse
 */
export async function GET(request: NextRequest) {
  try {
    // Get session information
    const session = await getSession();
    const userId = session?.user?.id;
    const sessionId = session?.expires ? session.expires.toString() : undefined; // Use expires as session identifier

    // Generate unique connection ID
    const connectionId = generateConnectionId();

    log.info("New SSE connection request", {
      connectionId,
      userId,
      hasSession: !!session,
    });

    // Initialize SSE manager and Redis
    const sseManager = getSSEManager();
    const redisClient = await getRedis();
    const redisService = new RedisService(redisClient);

    // Register the connection
    await sseManager.registerConnection(
      connectionId,
      userId,
      sessionId,
      request.headers,
    );

    // Create readable stream for SSE
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection event
        const welcomeEvent = {
          id: `welcome_${Date.now()}`,
          type: SSEEventType.CONNECTED,
          data: {
            connectionId,
            userId,
            message: "SSE connection established",
            timestamp: Date.now(),
          },
          timestamp: Date.now(),
          userId,
          sessionId,
        };

        controller.enqueue(
          new TextEncoder().encode(formatSSEMessage(welcomeEvent)),
        );

        // Register direct event listener for this connection
        sseManager.registerEventListener(connectionId, (event) => {
          log.info("Delivering event directly to client", {
            connectionId,
            eventType: event.type,
            eventId: event.id,
          });
          controller.enqueue(new TextEncoder().encode(formatSSEMessage(event)));
        });

        // Set up Redis subscription for this connection
        const setupSubscription = async () => {
          try {
            // Subscribe to connection-specific events
            const connectionChannel =
              SSERedisKeys.pubsub.connectionChannel(connectionId);

            // Subscribe to user-specific events if userId exists
            const userChannel = userId
              ? SSERedisKeys.pubsub.userChannel(userId)
              : null;

            // Subscribe to broadcast events
            const broadcastChannel = SSERedisKeys.pubsub.channel;

            // Note: In a real implementation, you'd need to set up Redis pub/sub listeners
            // For now, we'll implement a polling mechanism to check for events
            const checkForEvents = async () => {
              try {
                // This is a simplified implementation
                // In production, you'd use Redis SUBSCRIBE with a separate connection

                // Send both heartbeats and test events for debugging
                const heartbeatEvent = {
                  id: `heartbeat_${Date.now()}`,
                  type: SSEEventType.HEARTBEAT,
                  data: {
                    timestamp: Date.now(),
                    connectionId,
                    message: "Heartbeat - connection alive",
                  },
                  timestamp: Date.now(),
                  userId,
                  sessionId,
                };

                // Also send a test message every 30 seconds for debugging
                if (Date.now() % 30000 < 25000) {
                  const testEvent = {
                    id: `test_${Date.now()}`,
                    type: SSEEventType.TEST_MESSAGE,
                    data: {
                      message: "Auto test message - SSE is working!",
                      timestamp: Date.now(),
                      connectionId,
                    },
                    timestamp: Date.now(),
                    userId,
                    sessionId,
                  };

                  controller.enqueue(
                    new TextEncoder().encode(formatSSEMessage(testEvent)),
                  );
                }

                controller.enqueue(
                  new TextEncoder().encode(formatSSEMessage(heartbeatEvent)),
                );

                // Update heartbeat in Redis
                await sseManager.updateHeartbeat(connectionId);
              } catch (error) {
                log.error("Error in SSE event check", { error, connectionId });
              }
            };

            // Start heartbeat interval
            const heartbeatInterval = setInterval(checkForEvents, 25000); // 25 seconds

            // Handle connection cleanup
            const cleanup = async () => {
              clearInterval(heartbeatInterval);
              await sseManager.unregisterConnection(connectionId);
              log.info("SSE connection cleaned up", { connectionId });
            };

            // Set up cleanup on stream close
            request.signal.addEventListener("abort", cleanup);

            // Return cleanup function
            return cleanup;
          } catch (error) {
            handleError("Failed to setup SSE subscription", error);
            controller.close();
          }
        };

        // Setup subscription asynchronously
        setupSubscription().catch((error) => {
          log.error("Failed to setup SSE subscription", {
            error,
            connectionId,
          });
          controller.close();
        });
      },

      cancel() {
        // This will be called when the connection is closed
        sseManager.unregisterConnection(connectionId).catch((error) => {
          log.error("Error during connection cleanup", { error, connectionId });
        });
      },
    });

    // Return SSE response
    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control",
        "X-Connection-Id": connectionId,
      },
    });
  } catch (error) {
    handleError("SSE endpoint error", error);

    return new Response(
      JSON.stringify({
        error: "Failed to establish SSE connection",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

/**
 * Handle OPTIONS request for CORS
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

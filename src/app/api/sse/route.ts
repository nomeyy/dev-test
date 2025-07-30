import { NextRequest } from "next/server";
import { auth } from "@/features/auth/handlers";
import {
  SSEConnectionManager,
  SSEManagerError,
  SSEMessageFormatter,
  RedisConnectionStore,
  ConnectionStoreError,
  requireSSEEnabled,
  requireFeatureEnabled,
  getSecurityConfig,
  isOriginAllowed,
  getConnectionTimeout,
} from "@/features/sse";
import type { SSEConnection, SSEError } from "@/features/sse/types";
import { logger } from "@/utils/logging";

// Create a singleton SSE manager instance
const sseManager = new SSEConnectionManager();
const messageFormatter = new SSEMessageFormatter();
const contextLogger = logger.createContextLogger("SSE-API-Route");

// API metrics
let apiMetrics = {
  totalRequests: 0,
  successfulConnections: 0,
  failedConnections: 0,
  authenticationErrors: 0,
  connectionErrors: 0,
  lastError: null as Error | null,
  lastErrorTime: null as Date | null,
};

/**
 * GET handler for SSE connections
 * Establishes a Server-Sent Events connection with proper authentication
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  apiMetrics.totalRequests++;

  // Generate unique connection ID early for logging
  const connectionId = `sse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Check if SSE is enabled
    requireSSEEnabled();

    // Check origin if configured
    const origin = request.headers.get("origin");
    if (origin && !isOriginAllowed(origin)) {
      contextLogger.warn("Origin not allowed", {
        connectionId,
        origin,
      });

      return createErrorResponse("Origin not allowed", 403, {
        code: "ORIGIN_NOT_ALLOWED",
        origin,
      });
    }

    contextLogger.info("SSE connection request received", {
      connectionId,
      url: request.url,
      userAgent: request.headers.get("user-agent"),
      origin,
      timestamp: new Date().toISOString(),
    });

    // Get authentication session with error handling
    const securityConfig = getSecurityConfig();
    let session: any = null;

    if (securityConfig.requireAuth) {
      try {
        session = await auth();
        contextLogger.debug("Authentication completed", {
          connectionId,
          authenticated: !!session,
          userId: session?.user?.id,
        });

        if (!session) {
          apiMetrics.authenticationErrors++;
          apiMetrics.failedConnections++;

          return createErrorResponse("Authentication required", 401, {
            code: "AUTHENTICATION_REQUIRED",
            connectionId,
          });
        }
      } catch (authError) {
        apiMetrics.authenticationErrors++;
        apiMetrics.failedConnections++;

        contextLogger.error("Authentication failed", authError, {
          connectionId,
          duration: Date.now() - startTime,
        });

        return createErrorResponse("Authentication failed", 500, {
          code: "AUTHENTICATION_ERROR",
          connectionId,
          duration: Date.now() - startTime,
        });
      }
    } else {
      contextLogger.debug("Authentication not required", { connectionId });
    }

    // Extract connection parameters from URL search params
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId") || undefined;

    contextLogger.debug("Connection parameters extracted", {
      connectionId,
      clientId,
      userId: session?.user?.id,
    });

    // Create readable stream for SSE
    const stream = new ReadableStream({
      start(controller) {
        // Create SSE connection object
        const connection: SSEConnection = {
          id: connectionId,
          userId: session?.user?.id,
          sessionId: session ? `session_${session.user.id}` : undefined,
          clientId,
          controller,
          connectedAt: new Date(),
          lastPing: new Date(),
        };

        contextLogger.info("Starting SSE connection setup", {
          connectionId,
          userId: connection.userId,
          sessionId: connection.sessionId,
          clientId: connection.clientId,
        });

        // Register connection with SSE manager
        sseManager
          .addConnection(connection)
          .then(() => {
            apiMetrics.successfulConnections++;

            contextLogger.info("SSE connection registered successfully", {
              connectionId,
              setupDuration: Date.now() - startTime,
            });

            // Send connection confirmation event using the message formatter
            try {
              const confirmationMessage =
                messageFormatter.formatConnectionEvent(
                  "connected",
                  connectionId,
                  {
                    message: "SSE connection established successfully",
                    userId: session?.user?.id,
                    sessionId: connection.sessionId,
                    timestamp: new Date().toISOString(),
                  },
                );
              controller.enqueue(new TextEncoder().encode(confirmationMessage));

              contextLogger.debug("Connection confirmation sent", {
                connectionId,
              });
            } catch (error) {
              contextLogger.error(
                "Failed to send connection confirmation",
                error,
                {
                  connectionId,
                },
              );

              // Send error event if confirmation fails
              try {
                const errorMessage = messageFormatter.formatError(
                  error instanceof Error
                    ? error
                    : new Error("Failed to send connection confirmation"),
                  connectionId,
                );
                controller.enqueue(new TextEncoder().encode(errorMessage));
              } catch (errorFormattingError) {
                contextLogger.error(
                  "Failed to send error event",
                  errorFormattingError,
                  {
                    connectionId,
                  },
                );
              }
            }
          })
          .catch((error) => {
            apiMetrics.connectionErrors++;
            apiMetrics.failedConnections++;
            apiMetrics.lastError =
              error instanceof Error ? error : new Error(String(error));
            apiMetrics.lastErrorTime = new Date();

            contextLogger.error("Failed to register SSE connection", error, {
              connectionId,
              setupDuration: Date.now() - startTime,
            });

            // Send error event for connection registration failure
            try {
              const errorMessage = messageFormatter.formatError(
                error instanceof Error
                  ? error
                  : new Error("Failed to register SSE connection"),
                connectionId,
              );
              controller.enqueue(new TextEncoder().encode(errorMessage));
            } catch (errorFormattingError) {
              contextLogger.error(
                "Failed to send error event",
                errorFormattingError,
                {
                  connectionId,
                },
              );
              controller.error(error);
            }
          });

        // Handle client disconnect
        request.signal.addEventListener("abort", async () => {
          contextLogger.info("Client disconnect detected", {
            connectionId,
            reason: "client_abort",
          });

          try {
            // Send disconnection event before cleanup
            try {
              const disconnectionMessage =
                messageFormatter.formatConnectionEvent(
                  "disconnected",
                  connectionId,
                  {
                    reason: "client_disconnect",
                    timestamp: new Date().toISOString(),
                  },
                );
              controller.enqueue(
                new TextEncoder().encode(disconnectionMessage),
              );
            } catch (formattingError) {
              contextLogger.warn(
                "Failed to send disconnection event",
                formattingError,
                {
                  connectionId,
                },
              );
            }

            await sseManager.removeConnection(connectionId);
            contextLogger.info("SSE connection cleanup completed", {
              connectionId,
              reason: "client_disconnect",
            });
          } catch (error) {
            contextLogger.error("Error cleaning up connection", error, {
              connectionId,
            });
          }
        });
      },

      cancel() {
        contextLogger.info("Stream cancelled", {
          connectionId,
          reason: "stream_cancel",
        });

        // Clean up connection when stream is cancelled
        sseManager.removeConnection(connectionId).catch((error) => {
          contextLogger.error("Error cleaning up cancelled connection", error, {
            connectionId,
          });
        });
      },
    });

    // Return streaming response with proper SSE headers
    const response = new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
    });

    contextLogger.info("SSE response created successfully", {
      connectionId,
      totalDuration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });

    return response;
  } catch (error) {
    apiMetrics.failedConnections++;
    apiMetrics.lastError =
      error instanceof Error ? error : new Error(String(error));
    apiMetrics.lastErrorTime = new Date();

    contextLogger.error("SSE connection error", error, {
      connectionId,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });

    // Determine error type and create appropriate response
    if (error instanceof SSEManagerError) {
      return createErrorResponse(
        "SSE Manager Error",
        500,
        {
          code: error.code,
          connectionId,
          duration: Date.now() - startTime,
          details: error.details,
        },
        error,
      );
    } else if (error instanceof ConnectionStoreError) {
      return createErrorResponse(
        "Connection Store Error",
        500,
        {
          code: error.code,
          connectionId,
          duration: Date.now() - startTime,
          details: error.details,
        },
        error,
      );
    } else {
      return createErrorResponse(
        "Internal Server Error",
        500,
        {
          code: "UNKNOWN_ERROR",
          connectionId,
          duration: Date.now() - startTime,
        },
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }
}

/**
 * OPTIONS handler for CORS preflight requests
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}

/**
 * Create standardized error response
 */
function createErrorResponse(
  message: string,
  status: number,
  details: any,
  originalError?: Error,
): Response {
  const errorResponse: SSEError = {
    code: details.code || "UNKNOWN_ERROR",
    message,
    details,
    timestamp: new Date().toISOString(),
    connectionId: details.connectionId,
  };

  contextLogger.error("Creating error response", originalError, {
    status,
    errorCode: errorResponse.code,
    connectionId: details.connectionId,
  });

  return new Response(JSON.stringify(errorResponse), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// Internal functions for metrics (not exported from API route)
function getApiMetrics() {
  return {
    ...apiMetrics,
    successRate:
      apiMetrics.totalRequests > 0
        ? (apiMetrics.successfulConnections / apiMetrics.totalRequests) * 100
        : 0,
    timestamp: new Date().toISOString(),
  };
}

function resetApiMetrics(): void {
  apiMetrics = {
    totalRequests: 0,
    successfulConnections: 0,
    failedConnections: 0,
    authenticationErrors: 0,
    connectionErrors: 0,
    lastError: null,
    lastErrorTime: null,
  };

  contextLogger.info("API metrics reset", {
    timestamp: new Date().toISOString(),
  });
}

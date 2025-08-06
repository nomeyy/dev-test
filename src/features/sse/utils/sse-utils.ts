import type { SSEMessage } from "../types";

/**
 * Send an SSE message to connected clients
 * This function can be used by backend services (webhooks, job processors, etc.)
 */
export async function sendSSEMessage(message: SSEMessage): Promise<boolean> {
  try {
    const response = await fetch(
      `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/sse/send`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to send SSE message: ${response.statusText}`);
    }

    const result = await response.json();
    console.log("SSE message sent successfully:", result);
    return true;
  } catch (error) {
    console.error("Error sending SSE message:", error);
    return false;
  }
}

/**
 * Send a notification to all connected clients
 */
export async function sendNotification(
  title: string,
  message: string,
  type: "info" | "success" | "warning" | "error" = "info",
  data?: Record<string, unknown>,
): Promise<boolean> {
  return sendSSEMessage({
    event: "notification",
    data: {
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
      ...data,
    },
  });
}

/**
 * Send a user-specific message
 */
export async function sendUserMessage(
  userId: string,
  event: string,
  data: Record<string, unknown>,
): Promise<boolean> {
  return sendSSEMessage({
    event,
    data,
    target: userId,
  });
}

/**
 * Broadcast a message to all connected clients
 */
export async function broadcastMessage(
  event: string,
  data: Record<string, unknown>,
): Promise<boolean> {
  return sendSSEMessage({
    event,
    data,
    target: "all",
  });
}

/**
 * Get current SSE connection status
 */
export async function getSSEStatus(): Promise<{
  connectedClients: number;
  clients: Array<{
    id: string;
    userId?: string;
    sessionId?: string;
    lastPing: string;
  }>;
}> {
  try {
    const response = await fetch(
      `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/sse/send`,
    );

    if (!response.ok) {
      throw new Error(`Failed to get SSE status: ${response.statusText}`);
    }

    return (await response.json()) as {
      connectedClients: number;
      clients: Array<{
        id: string;
        userId?: string;
        sessionId?: string;
        lastPing: string;
      }>;
    };
  } catch (error) {
    console.error("Error getting SSE status:", error);
    return {
      connectedClients: 0,
      clients: [],
    };
  }
}

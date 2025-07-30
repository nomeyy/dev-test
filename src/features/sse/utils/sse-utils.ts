import type { SSEMessage } from "../types";

/**
 * Send a message to all connected SSE clients
 */
export async function broadcastSSEMessage(
  event: string,
  data: Record<string, unknown>,
): Promise<number> {
  try {
    const response = await fetch("/api/sse", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event,
        data,
        target: "all",
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to broadcast SSE message: ${response.statusText}`,
      );
    }

    const result = await response.json();
    return result.sentCount || 0;
  } catch (error) {
    console.error("Error broadcasting SSE message:", error);
    return 0;
  }
}

/**
 * Send a message to all clients of a specific user
 */
export async function sendSSEMessageToUser(
  userId: string,
  event: string,
  data: Record<string, unknown>,
): Promise<number> {
  try {
    const response = await fetch("/api/sse", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event,
        data,
        target: "user",
        targetId: userId,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to send SSE message to user: ${response.statusText}`,
      );
    }

    const result = await response.json();
    return result.sentCount || 0;
  } catch (error) {
    console.error("Error sending SSE message to user:", error);
    return 0;
  }
}

/**
 * Send a message to all clients of a specific session
 */
export async function sendSSEMessageToSession(
  sessionId: string,
  event: string,
  data: Record<string, unknown>,
): Promise<number> {
  try {
    const response = await fetch("/api/sse", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event,
        data,
        target: "session",
        targetId: sessionId,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to send SSE message to session: ${response.statusText}`,
      );
    }

    const result = await response.json();
    return result.sentCount || 0;
  } catch (error) {
    console.error("Error sending SSE message to session:", error);
    return 0;
  }
}

/**
 * Send a message to a specific client
 */
export async function sendSSEMessageToClient(
  clientId: string,
  event: string,
  data: Record<string, unknown>,
): Promise<boolean> {
  try {
    const response = await fetch("/api/sse", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event,
        data,
        target: "client",
        targetId: clientId,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to send SSE message to client: ${response.statusText}`,
      );
    }

    const result = await response.json();
    return result.sentCount > 0;
  } catch (error) {
    console.error("Error sending SSE message to client:", error);
    return false;
  }
}

/**
 * Send a notification message to a user
 */
export async function sendNotificationToUser(
  userId: string,
  title: string,
  message: string,
  type: "info" | "success" | "warning" | "error" = "info",
  data?: Record<string, unknown>,
): Promise<number> {
  return sendSSEMessageToUser(userId, "notification", {
    title,
    message,
    type,
    timestamp: Date.now(),
    ...data,
  });
}

/**
 * Send a system update message to all users
 */
export async function broadcastSystemUpdate(
  message: string,
  type: "info" | "maintenance" | "update" = "info",
  data?: Record<string, unknown>,
): Promise<number> {
  return broadcastSSEMessage("system_update", {
    message,
    type,
    timestamp: Date.now(),
    title: "System Update",
    ...data,
  });
}

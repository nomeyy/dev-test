import type {
  SSEClient,
  SSEConnectionOptions,
  SSEEvent,
  SSEStats,
  SSEEventType,
  SSEClientConnection,
} from "./types";

/**
 * A server-side implementation for managing Server-Sent Events (SSE).
 * This class handles client connections, message broadcasting, and heartbeats
 * to maintain long-lived connections for real-time updates.
 */
class SSEServer {
  private clients = new Map<string, SSEClient>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds

  constructor() {
    this.startHeartbeat();
  }

  /**
   * Creates a new streaming response and adds the client to the managed pool.
   * @param options - Optional metadata for the connection (e.g., userId, sessionId).
   * @returns A Response object that can be returned from a Next.js API route.
   */
  addClient(options: SSEConnectionOptions = {}): SSEClientConnection {
    const clientId = options.sessionId ?? crypto.randomUUID();
    let controller: ReadableStreamDefaultController;

    // Create a new ReadableStream to manage the SSE connection.
    const stream = new ReadableStream({
      start: (c) => {
        controller = c;
      },
      cancel: () => {
        this.removeClient(clientId);
      },
    });

    const client: SSEClient = {
      id: clientId,
      userId: options.userId,
      // Controller is guaranteed to be set in `start`.
      controller: controller!,
      lastPing: Date.now(),
      isAlive: true,
    };

    this.clients.set(clientId, client);
    console.log(
      `SSE: Client ${clientId} connected. Total clients: ${this.clients.size}`,
    );

    // Send an initial "open" event to confirm the connection.
    this.sendToClient(clientId, "open", {
      message: "SSE connection established.",
    });

    return {
      clientId,
      response: new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      }),
    };
  }

  /**
   * Remove a client connection and close its stream.
   */
  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      try {
        client.controller.close(); // Gracefully close the stream.
      } catch (error) {
        // Log error if closing stream fails, but don't re-throw.
        console.error(`SSE: Error closing stream for client ${clientId}:`, error);
      }
      this.clients.delete(clientId);
      console.log(
        `SSE: Client ${clientId} disconnected. Total clients: ${this.clients.size}`,
      );
    }
  }

  /**
   * Send a message to a specific client.
   * @param clientId - The unique identifier of the client.
   * @param event - The type of the event.
   * @param data - The data payload for the event.
   * @returns True if the message was sent successfully, false otherwise.
   */
  sendToClient(
    clientId: string,
    event: SSEEventType,
    data: unknown,
  ): boolean {
    const client = this.clients.get(clientId);
    if (!client?.isAlive) {
      this.removeClient(clientId);
      return false;
    }

    try {
      const sseEvent: SSEEvent = {
        id: crypto.randomUUID(),
        event,
        data: JSON.stringify(data),
      };

      const sseMessage = this.formatSSEMessage(sseEvent);
      // Use the stream controller to enqueue (send) the message.
      client.controller.enqueue(new TextEncoder().encode(sseMessage));

      console.log(`SSE: Sending ${event} to client ${clientId}`);
      return true;
    } catch (error) {
      console.error(`SSE: Error sending message to client ${clientId}:`, error);
      this.removeClient(clientId);
      return false;
    }
  }

  /**
   * Send a message to all clients of a specific user.
   * @returns The number of clients the message was sent to.
   */
  sendToUser(
    userId: string,
    event: SSEEventType,
    data: unknown,
  ): number {
    let sentCount = 0;
    for (const [clientId, client] of this.clients.entries()) {
      if (client.userId === userId && client.isAlive) {
        if (this.sendToClient(clientId, event, data)) {
          sentCount++;
        }
      }
    }
    console.log(
      `SSE: Sent ${event} to ${sentCount} clients for user ${userId}`,
    );
    return sentCount;
  }

  /**
   * Broadcast a message to all connected clients.
   * @returns The number of clients the message was sent to.
   */
  broadcast(
    event: SSEEventType,
    data: unknown,
  ): number {
    let sentCount = 0;
    for (const clientId of this.clients.keys()) {
      if (this.sendToClient(clientId, event, data)) {
        sentCount++;
      }
    }
    console.log(`SSE: Broadcasted ${event} to ${sentCount} clients`);
    return sentCount;
  }

  /**
   * Send a ping message to keep connections alive and prune dead ones.
   */
  private sendPing(): void {
    const now = Date.now();
    for (const [clientId, client] of this.clients.entries()) {
      // Send a ping to keep the connection alive.
      if (!this.sendToClient(clientId, "ping", { timestamp: now })) {
        console.warn(`SSE: Failed to send ping to ${clientId}. Removing.`);
        this.removeClient(clientId);
      } else {
        client.lastPing = now;
      }
    }
  }

  /**
   * Start the heartbeat mechanism to periodically send pings.
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.sendPing();
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Stop the heartbeat mechanism.
   */
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Format an SSE event into the correct string message format.
   */
  private formatSSEMessage(event: SSEEvent): string {
    let message = "";
    if (event.id) message += `id: ${event.id}\n`;
    if (event.event) message += `event: ${event.event}\n`;
    // Stringify data if it's not already a string
    if (event.data) message += `data: ${typeof event.data === 'string' ? event.data : JSON.stringify(event.data)}\n`;
    if (event.retry) message += `retry: ${event.retry}\n`;
    return message + "\n";
  }

  /**
   * Get connection statistics.
   */
  getStats(): SSEStats {
    const totalConnections = this.clients.size;
    const clients = Array.from(this.clients.values());
    const activeConnections = clients.filter((c) => c.isAlive).length;
    const privateConnections = clients.filter((c) => c.userId).length;
    const broadcastConnections = totalConnections - privateConnections;

    return {
      totalConnections,
      activeConnections,
      privateConnections,
      broadcastConnections,
    };
  }

  /**
   * Clean up all connections and stop the heartbeat.
   */
  cleanup(): void {
    this.stopHeartbeat();
    this.clients.forEach((_, clientId) => this.removeClient(clientId));
    this.clients.clear();
    console.log("SSE: All connections cleaned up");
  }
}

// Create a singleton instance for the server.
export const sseServer = new SSEServer();

// Utility functions for easy usage in your application.
export const sseUtils = {
  /**
   * Send a report status update to a specific user.
   */
  sendReportUpdate: (
    userId: string,
    reportId: string,
    status: "generating" | "completed" | "failed",
    message: string,
    progress?: number,
    downloadUrl?: string,
    error?: string,
  ) => {
    const data = {
      reportId,
      status,
      message,
      progress,
      downloadUrl,
      error,
      timestamp: new Date().toISOString(),
    };

    const eventType = `report.${status}` as SSEEventType;
    return sseServer.sendToUser(userId, eventType, data);
  },

  /**
   * Send a notification to a specific user.
   */
  sendNotification: (
    userId: string,
    title: string,
    message: string,
    type: "info" | "success" | "warning" | "error" = "info",
  ) => {
    const data = {
      title,
      message,
      type,
      timestamp: new Date().toISOString(),
    };

    return sseServer.sendToUser(userId, "notification", data);
  },

  /**
   * Broadcast a message to all connected clients.
   */
  broadcast: (
    event: SSEEventType,
    data: unknown,
  ) => {
    return sseServer.broadcast(event, data);
  },

  /**
   * Get server statistics.
   */
  getStats: () => {
    return sseServer.getStats();
  },
};

/**
 * SSEConnectionManager - Manages Server-Sent Events (SSE) connections
 *
 * This class provides a clean interface for managing SSE connections in a Next.js App Router
 * environment. It handles multiple connections per client, broadcasting, heartbeats, and
 * proper cleanup to prevent memory leaks.
 */

export interface SSEEvent {
  event: string;
  data: object;
}

export interface SSEConnection {
  controller: ReadableStreamDefaultController<Uint8Array>;
  clientId: string;
  connected: boolean;
}

export class SSEConnectionManager {
  private connections = new Map<string, Set<SSEConnection>>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 3000; // 3 seconds

  constructor() {
    console.log("[SSE] SSEConnectionManager initialized");
    this.startHeartbeat();
  }

  /**
   * Subscribe a new client connection to SSE
   * @param clientId - Unique identifier for the client
   * @param controller - ReadableStream controller from Next.js streaming response
   */
  public subscribe(
    clientId: string,
    controller: ReadableStreamDefaultController<Uint8Array>,
  ): void {
    try {
      const connection: SSEConnection = {
        controller,
        clientId,
        connected: true,
      };

      // Initialize client connections if not exists
      if (!this.connections.has(clientId)) {
        this.connections.set(clientId, new Set());
      }

      // Add this connection to the client's set
      this.connections.get(clientId)!.add(connection);

      console.log(
        `[SSE] Client ${clientId} subscribed. Total connections: ${this.getTotalConnectionCount()}`,
      );

      // Send initial connection message
      this.sendToConnection(connection, {
        event: "connected",
        data: {
          message: "Connected to SSE stream",
          clientId,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error(`[SSE] Error subscribing client ${clientId}:`, error);
      throw error;
    }
  }

  /**
   * Create a streaming response for SSE
   * @param clientId - Unique identifier for the client
   * @returns Response object with proper SSE headers and stream
   */
  public createSSEResponse(clientId: string): Response {
    const stream = new ReadableStream({
      start: (controller) => {
        this.subscribe(
          clientId,
          controller as ReadableStreamDefaultController<Uint8Array>,
        );
      },
      cancel: () => {
        console.log(`[SSE] Stream cancelled for client ${clientId}`);
        this.unsubscribe(clientId);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control",
      },
    });
  }

  /**
   * Unsubscribe a client connection or all connections for a client
   * @param clientId - Unique identifier for the client
   * @param targetController - Optional specific controller to unsubscribe
   */
  public unsubscribe(
    clientId: string,
    targetController?: ReadableStreamDefaultController<Uint8Array>,
  ): void {
    const clientConnections = this.connections.get(clientId);
    if (!clientConnections) {
      console.log(`[SSE] No connections found for client ${clientId}`);
      return;
    }

    if (targetController) {
      // Unsubscribe specific connection
      const connectionToRemove = Array.from(clientConnections).find(
        (conn) => conn.controller === targetController,
      );

      if (connectionToRemove) {
        this.closeConnection(connectionToRemove);
        clientConnections.delete(connectionToRemove);
        console.log(
          `[SSE] Specific connection unsubscribed for client ${clientId}`,
        );
      }
    } else {
      // Unsubscribe all connections for the client
      for (const connection of clientConnections) {
        this.closeConnection(connection);
      }
      clientConnections.clear();
      console.log(`[SSE] All connections unsubscribed for client ${clientId}`);
    }

    // Clean up empty client entry
    if (clientConnections.size === 0) {
      this.connections.delete(clientId);
      console.log(`[SSE] Client ${clientId} removed from connections map`);
    }

    console.log(
      `[SSE] Total connections remaining: ${this.getTotalConnectionCount()}`,
    );
  }

  /**
   * Send an event to a specific client or broadcast to all clients
   * @param target - Client ID or "broadcast" for all clients
   * @param event - Event name
   * @param data - Event data payload
   */
  public sendEvent(target: string, event: string, data: object): void {
    const sseEvent: SSEEvent = { event, data };

    if (target === "broadcast") {
      console.log(`[SSE] Broadcasting event "${event}" to all clients`);
      let sentCount = 0;

      for (const [, clientConnections] of this.connections.entries()) {
        for (const connection of clientConnections) {
          if (this.sendToConnection(connection, sseEvent)) {
            sentCount++;
          }
        }
      }

      console.log(`[SSE] Broadcast sent to ${sentCount} connections`);
    } else {
      // Send to specific client
      const clientConnections = this.connections.get(target);
      if (!clientConnections || clientConnections.size === 0) {
        console.log(`[SSE] No active connections for client ${target}`);
        return;
      }

      console.log(`[SSE] Sending event "${event}" to client ${target}`);
      let sentCount = 0;

      for (const connection of clientConnections) {
        if (this.sendToConnection(connection, sseEvent)) {
          sentCount++;
        }
      }

      console.log(
        `[SSE] Event sent to ${sentCount} connections for client ${target}`,
      );
    }
  }

  /**
   * Send heartbeat ping to all connected clients to keep connections alive
   */
  public sendHeartbeat(): void {
    console.log(
      `[SSE] Sending heartbeat to ${this.getTotalConnectionCount()} connections`,
    );

    let activeConnections = 0;
    const staleConnections: Array<{
      clientId: string;
      connection: SSEConnection;
    }> = [];

    for (const [clientId, clientConnections] of this.connections.entries()) {
      for (const connection of clientConnections) {
        try {
          if (!connection.connected) {
            staleConnections.push({ clientId, connection });
            continue;
          }

          const encoder = new TextEncoder();
          const heartbeat = encoder.encode(":ping\n\n");

          connection.controller.enqueue(heartbeat);
          activeConnections++;
        } catch {
          console.log(`[SSE] Stale connection detected for client ${clientId}`);
          connection.connected = false;
          staleConnections.push({ clientId, connection });
        }
      }
    }

    // Clean up stale connections
    for (const { clientId, connection } of staleConnections) {
      this.removeStaleConnection(clientId, connection);
    }

    console.log(
      `[SSE] Heartbeat sent to ${activeConnections} active connections`,
    );
  }

  /**
   * Get the total number of active connections across all clients
   */
  public getTotalConnectionCount(): number {
    let total = 0;
    for (const clientConnections of this.connections.values()) {
      total += clientConnections.size;
    }
    return total;
  }

  /**
   * Get the number of active connections for a specific client
   */
  public getClientConnectionCount(clientId: string): number {
    return this.connections.get(clientId)?.size ?? 0;
  }

  /**
   * Get all active client IDs
   */
  public getActiveClients(): string[] {
    return Array.from(this.connections.keys()).filter(
      (clientId) => this.connections.get(clientId)!.size > 0,
    );
  }

  /**
   * Clean up all connections and stop heartbeat
   */
  public destroy(): void {
    console.log("[SSE] Destroying SSEConnectionManager");

    // Stop heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Close all connections
    for (const [, clientConnections] of this.connections.entries()) {
      for (const connection of clientConnections) {
        this.closeConnection(connection);
      }
    }

    // Clear all connections
    this.connections.clear();
    console.log("[SSE] SSEConnectionManager destroyed");
  }

  // Private methods

  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, this.HEARTBEAT_INTERVAL);

    console.log(
      `[SSE] Heartbeat started with ${this.HEARTBEAT_INTERVAL}ms interval`,
    );
  }

  private sendToConnection(
    connection: SSEConnection,
    event: SSEEvent,
  ): boolean {
    try {
      if (!connection.connected) {
        return false;
      }

      const encoder = new TextEncoder();
      const message = this.formatSSEMessage(event);
      const encodedMessage = encoder.encode(message);

      connection.controller.enqueue(encodedMessage);
      return true;
    } catch (error) {
      console.error("[SSE] Error sending to connection:", error);
      connection.connected = false;
      return false;
    }
  }

  private formatSSEMessage(event: SSEEvent): string {
    const jsonData = JSON.stringify(event.data);
    return `event: ${event.event}\ndata: ${jsonData}\n\n`;
  }

  private closeConnection(connection: SSEConnection): void {
    if (!connection?.controller) return;

    connection.connected = false;

    try {
      connection.controller.close();
    } catch (error) {
      const isAlreadyClosed =
        error instanceof Error && error.message.includes("already closed");

      if (!isAlreadyClosed) {
        console.error(
          "[SSE] Unexpected error while closing controller:",
          error,
        );
      }
    }
  }

  private removeStaleConnection(
    clientId: string,
    connection: SSEConnection,
  ): void {
    const clientConnections = this.connections.get(clientId);
    if (clientConnections) {
      clientConnections.delete(connection);
      this.closeConnection(connection);

      if (clientConnections.size === 0) {
        this.connections.delete(clientId);
        console.log(`[SSE] Removed stale client ${clientId}`);
      }
    }
  }
}

// Export a singleton instance for easy usage
export const sseConnectionManager = new SSEConnectionManager();

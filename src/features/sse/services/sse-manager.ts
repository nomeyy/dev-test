import type { SSEClient, SSEMessage, SSEManager } from "../types";

/**
 * Server-Sent Events Manager
 * Handles client connections, message dispatching, and connection lifecycle
 */
export class SSEManagerService implements SSEManager {
  private clients = new Map<string, SSEClient>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 15000; // 15 seconds
  private readonly CLIENT_TIMEOUT = 300000; // 5 minutes
  private eventHistory: Array<{ event: string; data: any; timestamp: number }> =
    [];
  private readonly MAX_HISTORY_SIZE = 100; // Keep last 100 events

  constructor() {
    this.startHeartbeat();
  }

  /**
   * Add a new client to the SSE manager
   */
  addClient(client: SSEClient): void {
    this.clients.set(client.id, client);
    console.log(
      `SSE: Client ${client.id} connected. Total clients: ${this.clients.size}`,
    );
  }

  /**
   * Remove a client from the SSE manager
   */
  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.abortController.abort();
      this.clients.delete(clientId);
      console.log(
        `SSE: Client ${clientId} disconnected. Total clients: ${this.clients.size}`,
      );
    }
  }

  /**
   * Send a message to specific targets
   */
  sendMessage(message: SSEMessage): void {
    console.log(`SSE Manager: Sending message:`, {
      event: message.event,
      target: message.target,
      targetId: message.targetId,
      clientCount: this.clients.size,
    });

    switch (message.target) {
      case "all":
        this.broadcast(message.event, message.data);
        break;
      case "user":
        if (message.targetId) {
          this.sendToUser(message.targetId, message.event, message.data);
        }
        break;
      case "session":
        if (message.targetId) {
          this.sendToSession(message.targetId, message.event, message.data);
        }
        break;
      case "client":
        if (message.targetId) {
          this.sendToClient(message.targetId, message.event, message.data);
        }
        break;
      default:
        this.broadcast(message.event, message.data);
    }
  }

  /**
   * Broadcast a message to all connected clients
   */
  broadcast(event: string, data: any): void {
    console.log(`SSE Manager: Broadcasting to ${this.clients.size} clients`);

    // Add to event history
    this.addToHistory(event, data);

    const message = this.formatSSEMessage(event, data);
    this.clients.forEach((client) => {
      this.sendToClientStream(client, message);
    });
  }

  /**
   * Send a message to a specific user (all their connections)
   */
  sendToUser(userId: string, event: string, data: any): void {
    const message = this.formatSSEMessage(event, data);
    this.clients.forEach((client) => {
      if (client.userId === userId) {
        this.sendToClientStream(client, message);
      }
    });
  }

  /**
   * Send a message to a specific session
   */
  sendToSession(sessionId: string, event: string, data: any): void {
    const message = this.formatSSEMessage(event, data);
    this.clients.forEach((client) => {
      if (client.sessionId === sessionId) {
        this.sendToClientStream(client, message);
      }
    });
  }

  /**
   * Send a message to a specific client
   */
  sendToClient(clientId: string, event: string, data: any): void {
    const client = this.clients.get(clientId);
    if (client) {
      const message = this.formatSSEMessage(event, data);
      this.sendToClientStream(client, message);
    }
  }

  /**
   * Get all active clients
   */
  getActiveClients(): SSEClient[] {
    return Array.from(this.clients.values());
  }

  /**
   * Get the total number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get the event history
   */
  getEventHistory(): Array<{ event: string; data: any; timestamp: number }> {
    return [...this.eventHistory];
  }

  /**
   * Add an event to the history
   */
  private addToHistory(event: string, data: any): void {
    this.eventHistory.push({
      event,
      data,
      timestamp: Date.now(),
    });

    // Keep only the last MAX_HISTORY_SIZE events
    if (this.eventHistory.length > this.MAX_HISTORY_SIZE) {
      this.eventHistory = this.eventHistory.slice(-this.MAX_HISTORY_SIZE);
    }
  }

  /**
   * Clear the event history and notify all clients
   */
  clearEventHistory(): void {
    this.eventHistory = [];
    console.log("SSE Manager: Event history cleared");

    // Notify all connected clients to clear their local events
    this.broadcast("clear_events", { timestamp: Date.now() });
  }

  /**
   * Start the heartbeat mechanism to keep connections alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
      this.cleanupDeadConnections();
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Send heartbeat/ping to all clients
   */
  private sendHeartbeat(): void {
    const heartbeat = this.formatSSEMessage("ping", { timestamp: Date.now() });
    this.clients.forEach((client) => {
      this.sendToClientStream(client, heartbeat);
    });
  }

  /**
   * Clean up dead connections
   */
  private cleanupDeadConnections(): void {
    const now = Date.now();
    const deadClients: string[] = [];

    this.clients.forEach((client, clientId) => {
      if (now - client.lastPing > this.CLIENT_TIMEOUT) {
        deadClients.push(clientId);
      }
    });

    deadClients.forEach((clientId) => {
      this.removeClient(clientId);
    });
  }

  /**
   * Format a message for SSE transmission
   */
  private formatSSEMessage(event: string, data: any): string {
    const id = Date.now().toString();
    const jsonData = JSON.stringify(data);

    const message = `id: ${id}\nevent: ${event}\ndata: ${jsonData}\n\n`;
    return message;
  }

  /**
   * Send a message to a specific client's stream
   */
  private sendToClientStream(client: SSEClient, message: string): void {
    try {
      if (!client.isAlive) {
        console.log(`SSE: Client ${client.id} is not alive, removing`);
        this.removeClient(client.id);
        return;
      }

      // Use the controller to send the message
      if (client.controller && !client.abortController.signal.aborted) {
        const encoder = new TextEncoder();
        const chunk = encoder.encode(message);
        client.controller.enqueue(chunk);

        // Update last ping time when message is sent successfully
        client.lastPing = Date.now();
        // console.log(
        //   `SSE: Message sent to client ${client.id}:`,
        //   message.substring(0, 100) + "...",
        // );
      } else {
        console.log(
          `SSE: Cannot send message to client ${client.id} - controller or signal issue`,
        );
      }
    } catch (error) {
      console.error(
        `SSE: Error sending message to client ${client.id}:`,
        error,
      );
      this.removeClient(client.id);
    }
  }

  /**
   * Cleanup resources when the manager is destroyed
   */
  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.clients.forEach((client) => {
      client.abortController.abort();
    });

    this.clients.clear();
  }
}

// Singleton instance
let sseManager: SSEManagerService | null = null;

/**
 * Get the SSE manager instance (singleton pattern)
 */
export function getSSEManager(): SSEManagerService {
  if (!sseManager) {
    sseManager = new SSEManagerService();
  }
  return sseManager;
}

/**
 * Cleanup the SSE manager (useful for testing or shutdown)
 */
export function cleanupSSEManager(): void {
  if (sseManager) {
    sseManager.destroy();
    sseManager = null;
  }
}

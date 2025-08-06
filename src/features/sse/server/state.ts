import { logger } from "@/features/shared/logger";

interface SSEClient {
  id: string;
  controller: ReadableStreamDefaultController;
  lastPing: number;
  heartbeatInterval?: NodeJS.Timeout;
  failedHeartbeats: number;
  isActive: boolean;
}

const HEARTBEAT_INTERVAL = 15000; // 15 seconds
const CLIENT_TIMEOUT = 45000; // 45 seconds
const MAX_FAILED_HEARTBEATS = 3; // Maximum number of consecutive failed heartbeats before disconnect

class SSEState {
  private clients: Map<string, SSEClient> = new Map();
  private encoder = new TextEncoder();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Start cleanup interval to check for stale connections
    this.cleanupInterval = setInterval(
      () => this.cleanupStaleConnections(),
      30000,
    );
  }

  private cleanupStaleConnections() {
    const now = Date.now();
    for (const [clientId, client] of this.clients.entries()) {
      if (now - client.lastPing > CLIENT_TIMEOUT) {
        logger.warn("Client timed out", { clientId });
        this.removeClient(clientId);
      }
    }
  }

  private startHeartbeat(clientId: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Clear any existing heartbeat
    if (client.heartbeatInterval) {
      clearInterval(client.heartbeatInterval);
    }

    // Start new heartbeat
    client.heartbeatInterval = setInterval(async () => {
      try {
        if (!client.isActive) {
          logger.warn("Attempting to send heartbeat to inactive client", {
            clientId,
          });
          return;
        }

        await this.sendToClient(clientId, "ping", {
          timestamp: Date.now(),
          failedHeartbeats: client.failedHeartbeats,
        });

        // Reset failed heartbeats on successful ping
        client.failedHeartbeats = 0;
      } catch (error) {
        client.failedHeartbeats++;
        logger.warn("Heartbeat failed", {
          error,
          clientId,
          failedHeartbeats: client.failedHeartbeats,
        });

        if (client.failedHeartbeats >= MAX_FAILED_HEARTBEATS) {
          logger.error("Max failed heartbeats reached, disconnecting client", {
            clientId,
            failedHeartbeats: client.failedHeartbeats,
          });
          this.removeClient(clientId);
        }
      }
    }, HEARTBEAT_INTERVAL);
  }

  addClient(clientId: string, controller: ReadableStreamDefaultController) {
    // Remove existing client if any
    if (this.clients.has(clientId)) {
      this.removeClient(clientId);
    }

    // Add new client
    this.clients.set(clientId, {
      id: clientId,
      controller,
      lastPing: Date.now(),
      failedHeartbeats: 0,
      isActive: true,
    });

    // Start heartbeat for this client
    this.startHeartbeat(clientId);

    logger.info("Client connected", { clientId });
    this.broadcastClientCount();
  }

  removeClient(clientId: string) {
    const client = this.clients.get(clientId);
    if (client) {
      // Mark client as inactive first
      client.isActive = false;

      // Clear heartbeat interval
      if (client.heartbeatInterval) {
        clearInterval(client.heartbeatInterval);
      }

      // Close controller and remove client
      try {
        client.controller.close();
      } catch (error) {
        logger.error("Error closing client controller", {
          error,
          clientId,
          failedHeartbeats: client.failedHeartbeats,
        });
      }

      this.clients.delete(clientId);
      logger.info("Client disconnected", {
        clientId,
        failedHeartbeats: client.failedHeartbeats,
        lastPing: new Date(client.lastPing).toISOString(),
      });
      this.broadcastClientCount();
    }
  }

  async sendToClient(clientId: string, type: string, data: any) {
    const client = this.clients.get(clientId);
    if (!client) {
      throw new Error("Client not found");
    }

    try {
      const eventString = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
      client.controller.enqueue(this.encoder.encode(eventString));
      client.lastPing = Date.now(); // Update last ping time on successful send
      return true;
    } catch (error) {
      logger.error("Error sending to client", { error, clientId });
      this.removeClient(clientId);
      throw error;
    }
  }

  async broadcast(type: string, data: any) {
    const errors: Error[] = [];
    const eventString = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
    const encodedEvent = this.encoder.encode(eventString);

    for (const [clientId, client] of this.clients.entries()) {
      try {
        client.controller.enqueue(encodedEvent);
        client.lastPing = Date.now(); // Update last ping time on successful broadcast
      } catch (error) {
        errors.push(error as Error);
        this.removeClient(clientId);
      }
    }

    if (errors.length > 0) {
      logger.warn("Broadcast completed with errors", {
        errorCount: errors.length,
      });
    }
  }

  private async broadcastClientCount() {
    await this.broadcast("clientCount", { count: this.clients.size });
  }

  getClientCount() {
    return this.clients.size;
  }

  getClientIds() {
    return Array.from(this.clients.keys());
  }

  hasClient(clientId: string) {
    return this.clients.has(clientId);
  }

  // Cleanup method for server shutdown
  cleanup() {
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Clear all client heartbeats and connections
    for (const clientId of this.clients.keys()) {
      this.removeClient(clientId);
    }

    logger.info("SSE state cleaned up");
  }
}

// Export singleton instance
export const sseState = new SSEState();

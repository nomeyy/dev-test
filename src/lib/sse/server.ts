import type { SSEClient, SSEMessage, SSEEvent, SSEStats } from "./types";

class SSEManager {
  private clients: Map<string, SSEClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private stats: SSEStats = {
    totalConnections: 0,
    activeConnections: 0,
    totalEventsSent: 0,
    lastEventSent: null,
  };

  constructor() {
    this.startHeartbeat();
  }

  /**
   * Add a new client connection
   */
  addClient(client: SSEClient): void {
    this.clients.set(client.id, client);
    this.stats.totalConnections++;
    this.stats.activeConnections++;

    console.log(
      `SSE: ✅ Client ${client.id} connected. Total active: ${this.stats.activeConnections}`,
    );
    console.log(`SSE: 📊 Current clients:`, Array.from(this.clients.keys()));

    // Add a longer delay before allowing client removal to prevent race conditions
    setTimeout(() => {
      const currentClient = this.clients.get(client.id);
      if (currentClient && currentClient.isConnected) {
        console.log(
          `SSE: ✅ Client ${client.id} connection verified after delay`,
        );
      } else {
        console.log(
          `SSE: ⚠️ Client ${client.id} was removed during verification delay`,
        );
      }
    }, 5000); // Increased to 5 seconds

    // Add periodic verification
    const verificationInterval = setInterval(() => {
      const currentClient = this.clients.get(client.id);
      if (currentClient && currentClient.isConnected) {
        console.log(`SSE: ✅ Client ${client.id} still connected and active`);
      } else {
        console.log(
          `SSE: ⚠️ Client ${client.id} no longer in our list, clearing interval`,
        );
        clearInterval(verificationInterval);
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Remove a client connection
   */
  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      // Check if client was recently added (within last 60 seconds)
      const now = Date.now();
      const clientAge = now - (client.lastPing || now);

      if (clientAge < 60000) {
        console.log(
          `SSE: ⚠️ Preventing removal of recently connected client ${clientId} (age: ${clientAge}ms)`,
        );
        console.log(
          `SSE: ⚠️ Client will be protected for ${60000 - clientAge}ms more`,
        );
        return;
      }

      // Additional check: if client is still marked as connected, don't remove
      if (client.isConnected) {
        console.log(
          `SSE: ⚠️ Client ${clientId} is still marked as connected, preventing removal`,
        );
        return;
      }

      client.isConnected = false;
      this.clients.delete(clientId);
      this.stats.activeConnections--;

      console.log(
        `SSE: ❌ Client ${clientId} disconnected. Total active: ${this.stats.activeConnections}`,
      );
      console.log(
        `SSE: 📊 Remaining clients:`,
        Array.from(this.clients.keys()),
      );
    } else {
      console.log(
        `SSE: ⚠️ Attempted to remove non-existent client: ${clientId}`,
      );
    }
  }

  /**
   * Send an event to a specific client
   */
  sendToClient(clientId: string, event: string, data: any): boolean {
    const client = this.clients.get(clientId);
    if (!client) {
      console.log(
        `SSE: Failed to send to client ${clientId} - client not found`,
      );
      return false;
    }

    if (!client.isConnected) {
      console.log(
        `SSE: Failed to send to client ${clientId} - client not connected`,
      );
      return false;
    }

    // Additional safety check
    if (!client.controller) {
      console.log(`SSE: Failed to send to client ${clientId} - no controller`);
      return false;
    }

    try {
      const sseEvent: SSEEvent = {
        id: Date.now().toString(),
        event,
        data: JSON.stringify(data),
      };

      const message = this.formatSSEMessage(sseEvent);
      console.log(`SSE: 📤 Raw SSE message being sent:`, message);

      // Check if controller is still open before sending
      if (client.controller.desiredSize === null) {
        console.error(
          `SSE: Controller for client ${clientId} is closed, cannot send message`,
        );
        return false;
      }

      try {
        client.controller.enqueue(new TextEncoder().encode(message));
      } catch (enqueueError) {
        console.error(
          `SSE: Failed to enqueue message for client ${clientId}:`,
          enqueueError,
        );
        return false;
      }

      this.stats.totalEventsSent++;
      this.stats.lastEventSent = new Date();

      console.log(`SSE: ✅ Message sent to client ${clientId}`);
      console.log(`SSE: 📤 Event: ${event}`);
      console.log(`SSE: 📤 Data:`, data);
      console.log(
        `SSE: 📤 Client userId: ${client.userId}, sessionId: ${client.sessionId}`,
      );

      return true;
    } catch (error) {
      console.error(`SSE: Error sending to client ${clientId}:`, error);
      // Don't remove the client just because of a send error
      // Only remove if the controller is actually broken
      try {
        // Test if the controller is still working
        client.controller.enqueue(new TextEncoder().encode(""));
        console.log(
          `SSE: Controller for client ${clientId} is still working, keeping connection`,
        );
      } catch (controllerError) {
        console.error(
          `SSE: Controller for client ${clientId} is broken, removing client`,
        );
        this.removeClient(clientId);
      }
      return false;
    }
  }

  /**
   * Send an event to all clients
   */
  broadcast(event: string, data: any): number {
    let sentCount = 0;
    const disconnectedClients: string[] = [];

    console.log(`SSE: 📢 Broadcasting event "${event}" to all clients`);
    console.log(`SSE: 📢 Total clients available: ${this.clients.size}`);

    for (const [clientId, client] of this.clients) {
      if (client.isConnected) {
        console.log(
          `SSE: 📢 Attempting to send to client ${clientId} (userId: ${client.userId})`,
        );
        const success = this.sendToClient(clientId, event, data);
        if (success) {
          sentCount++;
        } else {
          disconnectedClients.push(clientId);
        }
      } else {
        console.log(`SSE: 📢 Skipping client ${clientId} - not connected`);
      }
    }

    // Clean up disconnected clients
    disconnectedClients.forEach((clientId) => this.removeClient(clientId));

    console.log(`SSE: 📢 Broadcast completed - sent to ${sentCount} clients`);
    return sentCount;
  }

  /**
   * Send an event to all clients of a specific user
   */
  sendToUser(userId: string, event: string, data: any): number {
    let sentCount = 0;
    const disconnectedClients: string[] = [];

    console.log(`SSE: 👤 Sending event "${event}" to user: ${userId}`);
    console.log(`SSE: 👤 Looking for clients with userId: ${userId}`);
    console.log(
      `SSE: 👤 Available clients and their userIds:`,
      Array.from(this.clients.entries()).map(([id, client]) => ({
        clientId: id,
        userId: client.userId,
        isConnected: client.isConnected,
      })),
    );

    for (const [clientId, client] of this.clients) {
      if (client.isConnected && client.userId === userId) {
        console.log(
          `SSE: 👤 ✅ Found matching client ${clientId} for user ${userId}`,
        );
        const success = this.sendToClient(clientId, event, data);
        if (success) {
          sentCount++;
        } else {
          disconnectedClients.push(clientId);
        }
      } else if (client.isConnected) {
        console.log(
          `SSE: 👤 ❌ Client ${clientId} has userId "${client.userId}" (not matching "${userId}")`,
        );
      } else {
        console.log(`SSE: 👤 ❌ Client ${clientId} is not connected`);
      }
    }

    // Clean up disconnected clients
    disconnectedClients.forEach((clientId) => this.removeClient(clientId));

    console.log(
      `SSE: 👤 User message result: ${sentCount} clients received the message`,
    );
    return sentCount;
  }

  /**
   * Send an event to all clients of a specific session
   */
  sendToSession(sessionId: string, event: string, data: any): number {
    let sentCount = 0;
    const disconnectedClients: string[] = [];

    console.log(`SSE: 🎭 Sending event "${event}" to session: ${sessionId}`);
    console.log(`SSE: 🎭 Looking for clients with sessionId: ${sessionId}`);

    for (const [clientId, client] of this.clients) {
      if (client.isConnected && client.sessionId === sessionId) {
        console.log(
          `SSE: 🎭 ✅ Found matching client ${clientId} for session ${sessionId}`,
        );
        const success = this.sendToClient(clientId, event, data);
        if (success) {
          sentCount++;
        } else {
          disconnectedClients.push(clientId);
        }
      } else if (client.isConnected) {
        console.log(
          `SSE: 🎭 ❌ Client ${clientId} has sessionId "${client.sessionId}" (not matching "${sessionId}")`,
        );
      } else {
        console.log(`SSE: 🎭 ❌ Client ${clientId} is not connected`);
      }
    }

    // Clean up disconnected clients
    disconnectedClients.forEach((clientId) => this.removeClient(clientId));

    console.log(
      `SSE: 🎭 Session message result: ${sentCount} clients received the message`,
    );
    return sentCount;
  }

  /**
   * Send a message with target specification
   */
  sendMessage(message: SSEMessage): number {
    console.log(`🚀 SSE: Starting message send operation`);
    console.log(`🚀 SSE: Event: "${message.event}"`);
    console.log(`🚀 SSE: Target: "${message.target}"`);
    console.log(`🚀 SSE: TargetID: "${message.targetId}"`);
    console.log(`🚀 SSE: Data:`, message.data);
    console.log(`🚀 SSE: Available clients:`, Array.from(this.clients.keys()));

    let sentCount = 0;

    switch (message.target) {
      case "all":
        console.log(`🚀 SSE: Using broadcast method`);
        sentCount = this.broadcast(message.event, message.data);
        break;
      case "user":
        if (message.targetId) {
          console.log(`🚀 SSE: Using sendToUser method`);
          sentCount = this.sendToUser(
            message.targetId,
            message.event,
            message.data,
          );
        } else {
          console.log(`🚀 SSE: ❌ No targetId provided for user target`);
        }
        break;
      case "session":
        if (message.targetId) {
          console.log(`🚀 SSE: Using sendToSession method`);
          sentCount = this.sendToSession(
            message.targetId,
            message.event,
            message.data,
          );
        } else {
          console.log(`🚀 SSE: ❌ No targetId provided for session target`);
        }
        break;
      case "client":
        if (message.targetId) {
          console.log(`🚀 SSE: Using sendToClient method`);
          const success = this.sendToClient(
            message.targetId,
            message.event,
            message.data,
          );
          sentCount = success ? 1 : 0;
        } else {
          console.log(`🚀 SSE: ❌ No targetId provided for client target`);
        }
        break;
      default:
        console.log(`🚀 SSE: ❌ Unknown target type: ${message.target}`);
    }

    console.log(`🚀 SSE: Final result - sent to ${sentCount} client(s)`);
    return sentCount;
  }

  /**
   * Send a heartbeat/ping to all connected clients
   */
  private sendHeartbeat(): void {
    const disconnectedClients: string[] = [];

    for (const [clientId, client] of this.clients) {
      if (client.isConnected) {
        try {
          const now = Date.now();
          const heartbeatEvent: SSEEvent = {
            event: "ping",
            data: JSON.stringify({ timestamp: now }),
          };

          const message = this.formatSSEMessage(heartbeatEvent);
          client.controller.enqueue(new TextEncoder().encode(message));
          client.lastPing = now;

          console.log(`SSE: 💓 Sent heartbeat to client ${clientId}`);
        } catch (error) {
          console.error(
            `SSE: Error sending heartbeat to client ${clientId}:`,
            error,
          );
          disconnectedClients.push(clientId);
        }
      }
    }

    // Clean up disconnected clients
    disconnectedClients.forEach((clientId) => this.removeClient(clientId));
  }

  /**
   * Start the heartbeat interval
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 60000); // Send heartbeat every 60 seconds instead of 30
  }

  /**
   * Stop the heartbeat interval
   */
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Format an SSE event as a string
   */
  private formatSSEMessage(event: SSEEvent): string {
    let message = "";

    if (event.id) {
      message += `id: ${event.id}\n`;
    }

    message += `event: ${event.event}\n`;
    message += `data: ${event.data}\n`;

    if (event.retry) {
      message += `retry: ${event.retry}\n`;
    }

    message += "\n";
    return message;
  }

  /**
   * Get current statistics
   */
  getStats(): SSEStats {
    return { ...this.stats };
  }

  /**
   * Get all connected clients
   */
  getConnectedClients(): SSEClient[] {
    return Array.from(this.clients.values()).filter(
      (client) => client.isConnected,
    );
  }

  /**
   * Clean up all resources
   */
  destroy(): void {
    this.stopHeartbeat();

    // Close all client connections
    for (const [clientId, client] of this.clients) {
      try {
        client.controller.close();
      } catch (error) {
        console.error(`SSE: Error closing client ${clientId}:`, error);
      }
    }

    this.clients.clear();
    this.stats.activeConnections = 0;
  }
}

// Create a singleton instance
export const sseManager = new SSEManager();

// Export utility functions for easy usage
export const sendSSEMessage = (message: SSEMessage): number => {
  return sseManager.sendMessage(message);
};

export const broadcastSSE = (event: string, data: any): number => {
  return sseManager.broadcast(event, data);
};

export const sendSSEToUser = (
  userId: string,
  event: string,
  data: any,
): number => {
  return sseManager.sendToUser(userId, event, data);
};

export const sendSSEToSession = (
  sessionId: string,
  event: string,
  data: any,
): number => {
  return sseManager.sendToSession(sessionId, event, data);
};

export const sendSSEToClient = (
  clientId: string,
  event: string,
  data: any,
): boolean => {
  return sseManager.sendToClient(clientId, event, data);
};

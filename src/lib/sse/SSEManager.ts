import type { SSEClient, SSEClientId, SSEEvent } from "@/types/sse";
import { logger } from "@/utils/logging";
import { SSE_CONFIG } from "./constants";

class SSEManager {
  private clients = new Map<SSEClientId, SSEClient>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private clientCounter = 0;

  generateUniqueClientId(): SSEClientId {
    this.clientCounter++;
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `client_${this.clientCounter}_${timestamp}_${random}`;
  }

  addClient(client: SSEClient) {
    this.clients.set(client.id, client);
    logger.info(
      SSE_CONFIG.LOGGER.PREFIX,
      `${SSE_CONFIG.LOGGER.MESSAGES.CLIENT_CONNECTED}: ${client.id}`,
    );
    if (!this.heartbeatInterval) this.startHeartbeat();
  }

  removeClient(clientId: SSEClientId) {
    const client = this.clients.get(clientId);
    if (client) {
      try {
        client.response.end();
      } catch (error) {
        logger.error(
          SSE_CONFIG.LOGGER.PREFIX,
          SSE_CONFIG.LOGGER.MESSAGES.CONNECTION_ERROR,
          error,
        );
      }
      this.clients.delete(clientId);
      logger.info(
        SSE_CONFIG.LOGGER.PREFIX,
        `${SSE_CONFIG.LOGGER.MESSAGES.CLIENT_DISCONNECTED}: ${clientId}`,
      );
    }
    if (this.clients.size === 0) this.stopHeartbeat();
  }

  sendEvent(clientId: SSEClientId, event: SSEEvent) {
    const client = this.clients.get(clientId);
    if (!client?.isAlive) {
      logger.warn(
        SSE_CONFIG.LOGGER.PREFIX,
        `${SSE_CONFIG.LOGGER.MESSAGES.INACTIVE_CLIENT}: ${clientId}`,
      );
      return false;
    }

    try {
      this.writeEvent(client.response, event);
      return true;
    } catch (error) {
      logger.error(
        SSE_CONFIG.LOGGER.PREFIX,
        `${SSE_CONFIG.LOGGER.MESSAGES.EVENT_SEND_FAILED} ${clientId}`,
        error,
      );
      this.removeClient(clientId);
      return false;
    }
  }

  broadcast(event: SSEEvent) {
    let successCount = 0;
    const clientIds = Array.from(this.clients.keys());

    for (const clientId of clientIds) {
      if (this.sendEvent(clientId, event)) {
        successCount++;
      }
    }

    logger.info(
      SSE_CONFIG.LOGGER.PREFIX,
      `${SSE_CONFIG.LOGGER.MESSAGES.BROADCAST_SENT} to ${successCount}/${clientIds.length} clients`,
    );
    return successCount;
  }

  sendToUser(userId: string, event: SSEEvent) {
    let successCount = 0;

    for (const [clientId, client] of this.clients.entries()) {
      if (client.userId === userId) {
        if (this.sendEvent(clientId, event)) {
          successCount++;
        }
      }
    }

    logger.info(
      SSE_CONFIG.LOGGER.PREFIX,
      `Event sent to user ${userId}: ${successCount} clients reached`,
    );
    return successCount;
  }

  private writeEvent(res: any, event: SSEEvent) {
    const data = `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
    res.write(data);
  }

  getStats() {
    const connectedUsers = Array.from(this.clients.values())
      .map((client) => client.userId || "anonymous")
      .filter((userId, index, arr) => arr.indexOf(userId) === index);

    return {
      clientCount: this.clients.size,
      connectedUsers,
      timestamp: new Date().toISOString(),
    };
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      const clientIds = Array.from(this.clients.keys());

      for (const clientId of clientIds) {
        const client = this.clients.get(clientId);
        if (!client) continue;

        try {
          client.response.write(": ping\n\n");
        } catch (error) {
          logger.error(
            SSE_CONFIG.LOGGER.PREFIX,
            `${SSE_CONFIG.LOGGER.MESSAGES.HEARTBEAT_FAILED} ${clientId}`,
            error,
          );
          this.removeClient(clientId);
        }
      }
    }, SSE_CONFIG.HEARTBEAT_MS);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  getClientCount() {
    return this.clients.size;
  }

  getConnectedUsers() {
    const users = new Set<string>();
    for (const client of this.clients.values()) {
      if (client.userId) users.add(client.userId);
    }
    return Array.from(users);
  }

  getAllClients() {
    return Array.from(this.clients.values());
  }

  isClientConnected(clientId: SSEClientId) {
    return this.clients.has(clientId);
  }

  cleanup() {
    // Close all client connections
    for (const clientId of this.clients.keys()) {
      this.removeClient(clientId);
    }

    // Stop heartbeat
    this.stopHeartbeat();
  }
}

export const sseManager = new SSEManager();

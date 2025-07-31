/**
 * SSE Heartbeat Manager
 *
 * Handles heartbeat mechanism, client health monitoring, and cleanup
 */

import { sseLogger } from "./logger";
import type {
  SSEServiceConfig,
  SSEEvent,
  HeartbeatConfig,
  HeartbeatStats,
} from "./types";
import type { ConnectionManager } from "./connection-manager";

export class HeartbeatManager {
  private heartbeatTimer?: NodeJS.Timeout;
  private totalHeartbeatsSent = 0;
  private totalHeartbeatsReceived = 0;
  private lastHeartbeatTime?: Date;

  constructor(
    private readonly config: SSEServiceConfig,
    private readonly connectionManager: ConnectionManager,
  ) {}

  /**
   * Start heartbeat mechanism
   */
  start(): void {
    if (!this.config.enableHeartbeat) {
      return;
    }

    sseLogger.info("HeartbeatManager", "Starting heartbeat mechanism", {
      interval: this.config.heartbeatInterval,
      timeout: this.config.clientTimeout,
    });

    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
      this.cleanupStaleClients();
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat mechanism
   */
  stop(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
      sseLogger.info("HeartbeatManager", "Heartbeat stopped");
    }
  }

  /**
   * Send heartbeat to all clients
   */
  sendHeartbeat(): void {
    const heartbeatEvent: SSEEvent = {
      type: "system:heartbeat",
      data: {
        timestamp: new Date().toISOString(),
        clientCount: this.connectionManager.getConnectionStats().totalClients,
        totalSent: this.totalHeartbeatsSent + 1,
      },
    };

    const clients = this.connectionManager.getAllClients();
    let successCount = 0;

    for (const client of clients.values()) {
      if (this.connectionManager.sendToClient(client.id, heartbeatEvent)) {
        client.lastHeartbeat = new Date();
        successCount++;
      }
    }

    // Update heartbeat tracking
    this.totalHeartbeatsSent++;
    this.lastHeartbeatTime = new Date();

    sseLogger.debug("HeartbeatManager", "Heartbeat sent", {
      totalClients: clients.size,
      successCount,
      totalSent: this.totalHeartbeatsSent,
    });
  }

  /**
   * Clean up stale clients based on heartbeat timeout
   */
  cleanupStaleClients(): void {
    const now = Date.now();
    const staleClients: string[] = [];
    const clients = this.connectionManager.getAllClients();

    for (const [clientId, client] of clients.entries()) {
      if (client.lastHeartbeat) {
        const timeSinceHeartbeat = now - client.lastHeartbeat.getTime();
        if (timeSinceHeartbeat > this.config.clientTimeout) {
          staleClients.push(clientId);
        }
      }
    }

    if (staleClients.length > 0) {
      sseLogger.info("HeartbeatManager", "Cleaning up stale clients", {
        staleCount: staleClients.length,
        timeout: this.config.clientTimeout,
      });

      for (const clientId of staleClients) {
        this.connectionManager.removeClient(clientId, "heartbeat_timeout");
      }
    }
  }

  /**
   * Update client ping (called from heartbeat endpoint)
   */
  updateClientPing(clientId: string): boolean {
    const success = this.connectionManager.updateClientPing(clientId);
    if (success) {
      this.totalHeartbeatsReceived++;
      sseLogger.debug("HeartbeatManager", "Client ping updated", {
        clientId,
        totalReceived: this.totalHeartbeatsReceived,
      });
    }
    return success;
  }

  /**
   * Get heartbeat configuration
   */
  getConfig(): HeartbeatConfig {
    return {
      enabled: this.config.enableHeartbeat,
      interval: this.config.heartbeatInterval,
      timeout: this.config.clientTimeout,
    };
  }

  /**
   * Get heartbeat statistics
   */
  getStats(): HeartbeatStats {
    const clients = this.connectionManager.getAllClients();
    let activePings = 0;

    // Count clients with recent heartbeats
    const now = Date.now();
    for (const client of clients.values()) {
      if (client.lastHeartbeat) {
        const timeSinceHeartbeat = now - client.lastHeartbeat.getTime();
        if (timeSinceHeartbeat <= this.config.heartbeatInterval * 2) {
          activePings++;
        }
      }
    }

    return {
      totalPings: this.totalHeartbeatsReceived,
      activePings,
      timeouts: this.totalHeartbeatsSent - this.totalHeartbeatsReceived,
      lastPing: this.lastHeartbeatTime,
    };
  }

  /**
   * Reset heartbeat statistics
   */
  resetStats(): void {
    this.totalHeartbeatsSent = 0;
    this.totalHeartbeatsReceived = 0;
    this.lastHeartbeatTime = undefined;

    sseLogger.info("HeartbeatManager", "Heartbeat statistics reset");
  }
}

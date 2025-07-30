import type { HeartbeatManager, SSEManager } from "./interfaces";
import type { HeartbeatConfig } from "../types";
import { getSSEConfig, isFeatureEnabled } from "../config";

/**
 * Manages heartbeat/ping messages for SSE connections to keep them alive
 * and detect stale connections for cleanup
 */
export class SSEHeartbeatManager implements HeartbeatManager {
  private heartbeatTimers = new Map<string, NodeJS.Timeout>();
  private connectionLastPing = new Map<string, Date>();
  private config: HeartbeatConfig;
  private sseManager: SSEManager;

  constructor(sseManager: SSEManager, config?: Partial<HeartbeatConfig>) {
    this.sseManager = sseManager;

    // Get configuration from environment or use provided config
    const sseConfig = getSSEConfig();
    this.config = {
      interval: config?.interval ?? sseConfig.heartbeat.interval,
      timeout: config?.timeout ?? sseConfig.heartbeat.timeout,
      maxMissedPings:
        config?.maxMissedPings ?? sseConfig.heartbeat.maxMissedPings,
      enabled: config?.enabled ?? sseConfig.heartbeat.enabled,
    };
  }

  /**
   * Start heartbeat for a specific connection
   */
  startHeartbeat(connectionId: string): void {
    // Check if heartbeat feature is enabled
    if (!this.config.enabled || !isFeatureEnabled("heartbeat")) {
      return;
    }

    // Stop existing heartbeat if any
    this.stopHeartbeat(connectionId);

    // Initialize last ping time
    this.connectionLastPing.set(connectionId, new Date());

    // Create heartbeat timer
    const timer = setInterval(async () => {
      await this.sendHeartbeat(connectionId);
    }, this.config.interval);

    this.heartbeatTimers.set(connectionId, timer);
  }

  /**
   * Stop heartbeat for a specific connection
   */
  stopHeartbeat(connectionId: string): void {
    const timer = this.heartbeatTimers.get(connectionId);
    if (timer) {
      clearInterval(timer);
      this.heartbeatTimers.delete(connectionId);
    }
    this.connectionLastPing.delete(connectionId);
  }

  /**
   * Update last ping time for a connection
   */
  updateLastPing(connectionId: string): void {
    this.connectionLastPing.set(connectionId, new Date());
  }

  /**
   * Clean up stale connections based on missed heartbeats
   */
  async cleanupStaleConnections(): Promise<string[]> {
    const staleConnections: string[] = [];
    const now = new Date();
    const staleThreshold = this.config.timeout * this.config.maxMissedPings;

    // Check each connection's last ping time
    for (const [connectionId, lastPing] of this.connectionLastPing) {
      const timeSinceLastPing = now.getTime() - lastPing.getTime();

      if (timeSinceLastPing > staleThreshold) {
        staleConnections.push(connectionId);

        // Stop heartbeat and remove connection
        this.stopHeartbeat(connectionId);

        try {
          await this.sseManager.removeConnection(connectionId);
        } catch (error) {
          console.error(
            `Failed to remove stale connection ${connectionId}:`,
            error,
          );
        }
      }
    }

    return staleConnections;
  }

  /**
   * Send heartbeat/ping event to a specific connection
   */
  private async sendHeartbeat(connectionId: string): Promise<void> {
    try {
      // Use the SSE manager's sendHeartbeat method which uses the message formatter
      const success = await this.sseManager.sendHeartbeat(connectionId);

      if (success) {
        this.updateLastPing(connectionId);
      } else {
        // Failed to send heartbeat, connection might be stale
        console.warn(`Failed to send heartbeat to connection ${connectionId}`);

        // Check if we should remove this connection
        const lastPing = this.connectionLastPing.get(connectionId);
        if (lastPing) {
          const timeSinceLastPing = Date.now() - lastPing.getTime();
          if (timeSinceLastPing > this.config.timeout) {
            this.stopHeartbeat(connectionId);
            await this.sseManager.removeConnection(connectionId);
          }
        }
      }
    } catch (error) {
      console.error(
        `Error sending heartbeat to connection ${connectionId}:`,
        error,
      );

      // On error, stop heartbeat and remove connection
      this.stopHeartbeat(connectionId);
      try {
        await this.sseManager.removeConnection(connectionId);
      } catch (removeError) {
        console.error(
          `Failed to remove connection ${connectionId} after heartbeat error:`,
          removeError,
        );
      }
    }
  }

  /**
   * Get current heartbeat configuration
   */
  getConfig(): HeartbeatConfig {
    return { ...this.config };
  }

  /**
   * Update heartbeat configuration
   */
  updateConfig(newConfig: Partial<HeartbeatConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };
  }

  /**
   * Get active heartbeat count
   */
  getActiveHeartbeatCount(): number {
    return this.heartbeatTimers.size;
  }

  /**
   * Get connection last ping times (for debugging/monitoring)
   */
  getConnectionPingTimes(): Map<string, Date> {
    return this.connectionLastPing;
  }

  /**
   * Cleanup all heartbeats (useful for shutdown)
   */
  cleanup(): void {
    // Stop all heartbeat timers
    for (const [connectionId] of this.heartbeatTimers) {
      this.stopHeartbeat(connectionId);
    }
  }
}

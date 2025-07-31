import type { ReadableStreamDefaultController } from "stream/web";

/**
 * Centralized SSE Manager for handling all SSE connections and event dispatching.
 * Provides a clean API for backend modules to send events to clients.
 */
export class SSEManager {
  private static _instance: SSEManager;
  private connections = new Map<
    string,
    Set<ReadableStreamDefaultController<Uint8Array>>
  >();

  public static get instance(): SSEManager {
    if (!SSEManager._instance) {
      SSEManager._instance = new SSEManager();
    }
    return SSEManager._instance;
  }

  /**
   * Register a new client connection for a user.
   */
  public registerConnection(
    userId: string,
    controller: ReadableStreamDefaultController<Uint8Array>,
  ) {
    let userConnections = this.connections.get(userId);
    if (!userConnections) {
      userConnections = new Set();
      this.connections.set(userId, userConnections);
    }
    userConnections.add(controller);
    this.broadcastSystemUpdate(`User ${userId.substring(0, 8)}... connected`);
    return () => {
      const userConns = this.connections.get(userId);
      if (!userConns) return;
      userConns.delete(controller);
      if (userConns.size === 0) {
        this.connections.delete(userId);
      }
      this.broadcastSystemUpdate(
        `User ${userId.substring(0, 8)}... disconnected`,
      );
    };
  }

  /**
   * Send an event to a specific user.
   */
  public sendEvent(
    userId: string,
    event: string,
    data: Record<string, unknown>,
  ): boolean {
    const userConnections = this.connections.get(userId);
    if (!userConnections || userConnections.size === 0) {
      return false;
    }
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    const payload = new TextEncoder().encode(message);
    for (const controller of userConnections) {
      try {
        controller.enqueue(payload);
      } catch (error) {
        console.error(`[SSE] Failed to send event to user ${userId}.`, error);
      }
    }
    this.broadcastSystemUpdate(
      `Sent '${event}' event to user ${userId.substring(0, 8)}...`,
    );
    return true;
  }

  /**
   * Broadcast an event to all users.
   */
  public broadcastEvent(event: string, data: Record<string, unknown>) {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    const payload = new TextEncoder().encode(message);
    let sentCount = 0;
    for (const userConnections of this.connections.values()) {
      for (const controller of userConnections) {
        try {
          controller.enqueue(payload);
          sentCount++;
        } catch (error) {
          console.error(`[SSE] Failed to broadcast event.`, error);
        }
      }
    }
    if (event !== "system-update" && sentCount > 0) {
      this.broadcastSystemUpdate(
        `Broadcasted '${event}' event to ${sentCount} connection(s).`,
      );
    }
  }

  /**
   * Get current connection stats.
   */
  public getStats() {
    const userIds = Array.from(this.connections.keys());
    const totalUsers = this.connections.size;
    const totalConnections = userIds.reduce(
      (acc, userId) => acc + (this.connections.get(userId)?.size ?? 0),
      0,
    );
    return { userIds, totalUsers, totalConnections };
  }

  /**
   * Broadcast a system update event.
   */
  private broadcastSystemUpdate(log: string) {
    const stats = this.getStats();
    this.broadcastEvent("system-update", { log, stats });
  }
}

export const sseManager = SSEManager.instance;

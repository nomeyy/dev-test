import type { EventBus } from "./bus";
import type { Target, SseEventEnvelope, ConnectionInfo, SseError, ConnectionStatus, SseStats } from "./types";
import { log } from "@/lib/logger";

type ConnId = string;

interface Connection {
  info: ConnectionInfo;
  status: ConnectionStatus;
  send: (evt: SseEventEnvelope) => void;
  dispose: () => Promise<void>;
  error?: SseError;
}

export class ConnectionManager {
  private connections = new Map<ConnId, Connection>();
  private startTime = Date.now();
  private totalEventsSent = 0;
  private totalErrors = 0;
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(private bus: EventBus) {
    this.startHeartbeat();
  }

  private startHeartbeat() {
    // Send heartbeat every 30 seconds to keep connections alive
    this.heartbeatInterval = setInterval(() => {
      this.broadcastHeartbeat();
    }, 30000);
  }

  private async broadcastHeartbeat() {
    try {
      await this.send({ type: "broadcast" }, "heartbeat", { timestamp: Date.now() });
    } catch (error) {
      log.error("Failed to send heartbeat", { error });
    }
  }

  async register(opts: {
    connId: ConnId;
    userId?: string;
    sessionId?: string;
    topics?: string[];
    send: (evt: SseEventEnvelope) => void;
    userAgent?: string;
    ip?: string;
  }): Promise<() => Promise<void>> {
    try {
      const subs: Array<() => Promise<void>> = [];
      const sub = async (ch: string) => {
        const unsubscribe = await this.bus.subscribe(ch, (evt) => {
          try {
            opts.send(evt);
            this.totalEventsSent++;
            this.updateConnectionActivity(opts.connId);
                     } catch (error) {
             log.error("Failed to send event to connection", { 
               connId: opts.connId, 
               error,
               event: evt 
             });
             this.handleConnectionError(opts.connId, {
               code: "SEND_ERROR",
               message: "Failed to send event to client",
               details: error,
               timestamp: Date.now()
             });
           }
        });
        subs.push(unsubscribe);
      };

      // Subscribe to channels
      await sub("broadcast");
      if (opts.userId) await sub(`user:${opts.userId}`);
      if (opts.sessionId) await sub(`session:${opts.sessionId}`);
      for (const topic of (opts.topics ?? [])) {
        await sub(`topic:${topic}`);
      }

      const connectionInfo: ConnectionInfo = {
        connId: opts.connId,
        userId: opts.userId,
        sessionId: opts.sessionId,
        topics: opts.topics ?? [],
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        userAgent: opts.userAgent,
        ip: opts.ip,
      };

      const connection: Connection = {
        info: connectionInfo,
        status: 'connected',
        send: opts.send,
        dispose: async () => {
          await Promise.all(subs.map(s => s()));
        }
      };

      this.connections.set(opts.connId, connection);
      
      log.info("SSE connection registered", {
        connId: opts.connId,
        userId: opts.userId,
        sessionId: opts.sessionId,
        topics: opts.topics,
        totalConnections: this.connections.size
      });

      // Send welcome message
      await this.sendToConnection(opts.connId, "connected", {
        connId: opts.connId,
        timestamp: Date.now()
      });

      return async () => this.unregister(opts.connId);
    } catch (error) {
      log.error("Failed to register SSE connection", { 
        connId: opts.connId, 
        error 
      });
      throw error;
    }
  }

  async unregister(connId: ConnId) {
    const connection = this.connections.get(connId);
    if (!connection) {
      log.warn("Attempted to unregister non-existent connection", { connId });
      return;
    }

    try {
      await connection.dispose();
      this.connections.delete(connId);
      
      log.info("SSE connection unregistered", {
        connId,
        userId: connection.info.userId,
        duration: Date.now() - connection.info.connectedAt,
        totalConnections: this.connections.size
      });
    } catch (error) {
      log.error("Error during connection cleanup", { connId, error });
    }
  }

  private updateConnectionActivity(connId: ConnId) {
    const connection = this.connections.get(connId);
    if (connection) {
      connection.info.lastActivity = Date.now();
    }
  }

  private handleConnectionError(connId: ConnId, error: SseError) {
    const connection = this.connections.get(connId);
    if (connection) {
      connection.status = 'error';
      connection.error = error;
      this.totalErrors++;
      
      log.error("SSE connection error", {
        connId,
        error: error.message,
        code: error.code
      });
    }
  }

  async send(target: Target, event: string, data: any) {
    try {
      const envelope: SseEventEnvelope = {
        event,
        data,
        timestamp: Date.now()
      };

      const channel =
        target.type === "broadcast" ? "broadcast" :
        target.type === "user"      ? `user:${target.userId}` :
        target.type === "session"   ? `session:${target.sessionId}` :
                                      `topic:${target.topic}`;

      await this.bus.publish(channel, envelope);
      
      log.info("SSE event sent", {
        target,
        event,
        channel,
        dataSize: JSON.stringify(data).length
      });
    } catch (error) {
      log.error("Failed to send SSE event", { target, event, error });
      throw error;
    }
  }

  async sendToConnection(connId: ConnId, event: string, data: any) {
    const connection = this.connections.get(connId);
    if (!connection) {
      throw new Error(`Connection ${connId} not found`);
    }

    try {
      const envelope: SseEventEnvelope = {
        event,
        data,
        timestamp: Date.now()
      };

      connection.send(envelope);
      this.totalEventsSent++;
      this.updateConnectionActivity(connId);
    } catch (error) {
      this.handleConnectionError(connId, {
        code: "SEND_ERROR",
        message: "Failed to send event to specific connection",
        details: error,
        timestamp: Date.now()
      });
      throw error;
    }
  }

  getConnectionInfo(connId: ConnId): ConnectionInfo | null {
    const connection = this.connections.get(connId);
    return connection ? connection.info : null;
  }

  getConnectionsByUser(userId: string): ConnectionInfo[] {
    return Array.from(this.connections.values())
      .filter(conn => conn.info.userId === userId)
      .map(conn => conn.info);
  }

  getConnectionsByTopic(topic: string): ConnectionInfo[] {
    return Array.from(this.connections.values())
      .filter(conn => conn.info.topics.includes(topic))
      .map(conn => conn.info);
  }

  getStats(): SseStats {
    const connectionsByUser: Record<string, number> = {};
    const connectionsByTopic: Record<string, number> = {};

    for (const connection of this.connections.values()) {
      if (connection.info.userId) {
        connectionsByUser[connection.info.userId] = 
          (connectionsByUser[connection.info.userId] || 0) + 1;
      }
      
      for (const topic of connection.info.topics) {
        connectionsByTopic[topic] = 
          (connectionsByTopic[topic] || 0) + 1;
      }
    }

    return {
      totalConnections: this.connections.size,
      activeConnections: Array.from(this.connections.values())
        .filter(conn => conn.status === 'connected').length,
      totalEventsSent: this.totalEventsSent,
      totalErrors: this.totalErrors,
      uptime: Date.now() - this.startTime,
      connectionsByUser,
      connectionsByTopic
    };
  }

  async cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Clean up all connections
    const connIds = Array.from(this.connections.keys());
    await Promise.all(connIds.map(connId => this.unregister(connId)));
    
    log.info("SSE manager cleaned up", { totalConnections: connIds.length });
  }
}

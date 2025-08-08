import type { NextApiResponse } from "next";

export interface SSEEvent {
  event: string;
  data: Record<string, unknown>;
}

export interface SSEClient {
  userId: string;
  response: NextApiResponse;
  lastActivity: number;
}

export class SSEManager {
  private clients: Map<string, SSEClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isHeartbeatRunning = false;

  // add new client
  public addClient(userId: string, res: NextApiResponse): void {
    try {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control",
      });

      const client: SSEClient = {
        userId,
        response: res,
        lastActivity: Date.now(),
      };

      this.clients.set(userId, client);

      this.sendEventToClient(client, "connected", {
        message: "SSE connection established",
        userId,
        timestamp: new Date().toISOString(),
      });

      if (!this.isHeartbeatRunning) {
        this.startHeartbeat();
      }

      console.log(`[SSE] New client connected: ${userId}`);
      console.log(`[SSE] Total clients: ${this.clients.size}`);

      res.on("close", () => {
        this.removeClient(userId);
      });

      res.on("error", (error) => {
        console.error(`[SSE] Error with client ${userId}:`, error);
        this.removeClient(userId);
      });
    } catch (error) {
      console.error(`[SSE] Error adding client ${userId}:`, error);
      throw error;
    }
  }

  // remove client
  public removeClient(userId: string): void {
    try {
      const client = this.clients.get(userId);
      if (client) {
        if (!client.response.destroyed) {
          client.response.end();
        }

        this.clients.delete(userId);
        console.log(`[SSE] Client disconnected: ${userId}`);
        console.log(`[SSE] Total clients: ${this.clients.size}`);

        if (this.clients.size === 0 && this.isHeartbeatRunning) {
          this.stopHeartbeat();
        }
      }
    } catch (error) {
      console.error(`[SSE] Error removing client ${userId}:`, error);
    }
  }

  // send to user
  public sendToUser(
    userId: string,
    event: string,
    payload: Record<string, unknown>,
  ): void {
    try {
      const client = this.clients.get(userId);
      if (!client) {
        console.warn(`[SSE] Client ${userId} not found`);
        return;
      }

      this.sendEventToClient(client, event, payload);
      console.log(`[SSE] Sent '${event}' to ${userId}`);
    } catch (error) {
      console.error(`[SSE] Error sending to user ${userId}:`, error);
    }
  }

  // broadcast
  public broadcast(event: string, payload: Record<string, unknown>): void {
    try {
      const disconnectedClients: string[] = [];

      this.clients.forEach((client, userId) => {
        try {
          this.sendEventToClient(client, event, payload);
        } catch (error) {
          console.error(`[SSE] Error broadcasting to ${userId}:`, error);
          disconnectedClients.push(userId);
        }
      });

      disconnectedClients.forEach((userId) => {
        this.removeClient(userId);
      });

      console.log(
        `[SSE] Broadcasted '${event}' to ${this.clients.size} clients`,
      );
    } catch (error) {
      console.error("[SSE] Error broadcasting:", error);
    }
  }

  // start heartbeat
  public startHeartbeat(intervalMs: number = 30000): void {
    if (this.isHeartbeatRunning) {
      console.warn("[SSE] Heartbeat already running");
      return;
    }

    this.isHeartbeatRunning = true;
    this.heartbeatInterval = setInterval(() => {
      try {
        this.broadcast("ping", {
          timestamp: new Date().toISOString(),
          clientCount: this.clients.size,
        });
      } catch (error) {
        console.error("[SSE] Heartbeat error:", error);
      }
    }, intervalMs);

    console.log(`[SSE] Heartbeat started (${intervalMs}ms interval)`);
  }

  // stop heartbeat
  public stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      this.isHeartbeatRunning = false;
      console.log("[SSE] Heartbeat stopped");
    }
  }

  // client count
  public getClientCount(): number {
    return this.clients.size;
  }

  // connected users
  public getConnectedUsers(): string[] {
    return Array.from(this.clients.keys());
  }

  // destroy
  public destroy(): void {
    try {
      this.stopHeartbeat();

      this.clients.forEach((client, userId) => {
        this.removeClient(userId);
      });

      console.log("[SSE] Manager destroyed");
    } catch (error) {
      console.error("[SSE] Error destroying manager:", error);
    }
  }

  // send event to client
  private sendEventToClient(
    client: SSEClient,
    event: string,
    data: Record<string, unknown>,
  ): void {
    try {
      if (client.response.destroyed) {
        throw new Error("Response is destroyed");
      }

      const sseEvent: SSEEvent = {
        event,
        data: {
          ...data,
          timestamp: new Date().toISOString(),
        },
      };

      const eventString = `event: ${sseEvent.event}\ndata: ${JSON.stringify(sseEvent.data)}\n\n`;

      client.response.write(eventString);
      client.lastActivity = Date.now();
    } catch (error) {
      console.error(
        `[SSE] Error sending event to client ${client.userId}:`,
        error,
      );
      throw error;
    }
  }
}

export const sseManager = new SSEManager();

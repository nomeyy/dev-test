import { logger } from "@/utils/logging";
import type {
  SSEClient,
  SSEEvent,
  SSEConfig,
  ClientFilter,
  SSEStats,
} from "../types";

export class EventService {
  private clients = new Map<string, SSEClient>();
  private pingInterval: NodeJS.Timeout | null = null;
  private totalEventsSent = 0;
  private lastEventTime?: number;
  private readonly config: Required<SSEConfig>;

  constructor(config: SSEConfig = {}) {
    this.config = {
      pingInterval: config.pingInterval ?? 45000, // 45s for less frequent heartbeats
      clientTimeout: config.clientTimeout ?? 90000, // 90s timeout
      maxClients: config.maxClients ?? 1000,
      enableLogging: config.enableLogging ?? true,
    };
    this.startPingInterval();
  }

  createConnection(
    options: {
      userId?: string;
      sessionId?: string;
      metadata?: Record<string, string>;
    } = {},
  ): Response {
    if (this.clients.size >= this.config.maxClients) {
      throw new Error("Maximum number of clients reached");
    }

    const clientId = this.generateClientId();
    const encoder = new TextEncoder();
    let clientRef: SSEClient;

    const stream = new ReadableStream({
      start: (controller) => {
        const client: SSEClient = {
          id: clientId,
          userId: options.userId,
          sessionId: options.sessionId,
          controller,
          connectedAt: Date.now(),
          lastPing: Date.now(),
          metadata: options.metadata,
        };
        clientRef = client;
        this.clients.set(clientId, client);

        if (this.config.enableLogging) {
          logger.info("SSE", "Client connected", {
            clientId,
            userId: options.userId,
            sessionId: options.sessionId,
            totalClients: this.clients.size,
          });
        }

        this.sendToClient(clientId, {
          event: "connected",
          data: { clientId, connectedAt: client.connectedAt },
        });
      },
      cancel: () => {
        this.disconnectClient(clientId);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  sendToClient<T>(clientId: string, event: SSEEvent<T>): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;

    try {
      const message = this.formatEvent(event);
      client.controller.enqueue(new TextEncoder().encode(message));
      this.totalEventsSent++;
      this.lastEventTime = Date.now();
      return true;
    } catch (error) {
      this.disconnectClient(clientId);
      return false;
    }
  }

  sendToClients<T>(filter: ClientFilter, event: SSEEvent<T>): number {
    const clients = this.getClientsByFilter(filter);
    return clients.reduce(
      (count, client) =>
        this.sendToClient(client.id, event) ? count + 1 : count,
      0,
    );
  }

  broadcast<T>(event: SSEEvent<T>): number {
    return this.sendToClients({}, event);
  }

  sendToUser<T>(userId: string, event: SSEEvent<T>): number {
    return this.sendToClients({ userId }, event);
  }

  disconnectClient(clientId: string): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;

    try {
      client.controller.close();
      this.clients.delete(clientId);
      if (this.config.enableLogging) {
        logger.info("SSE", "Client disconnected", {
          clientId,
          userId: client.userId,
          connectionDuration: Date.now() - client.connectedAt,
        });
      }
      return true;
    } catch {
      return false;
    }
  }

  getStats(): SSEStats {
    const clientsByUser: Record<string, number> = {};
    let totalConnectionDuration = 0;
    const now = Date.now();

    for (const client of this.clients.values()) {
      if (client.userId)
        clientsByUser[client.userId] = (clientsByUser[client.userId] || 0) + 1;
      totalConnectionDuration += now - client.connectedAt;
    }

    return {
      totalClients: this.clients.size,
      clientsByUser,
      averageConnectionDuration:
        this.clients.size > 0 ? totalConnectionDuration / this.clients.size : 0,
      totalEventsSent: this.totalEventsSent,
      lastEventTime: this.lastEventTime,
    };
  }

  public getClientsByFilter(filter: ClientFilter): SSEClient[] {
    const clients: SSEClient[] = [];
    for (const client of this.clients.values()) {
      if (filter.clientIds && !filter.clientIds.includes(client.id)) continue;
      if (filter.userId && client.userId !== filter.userId) continue;
      if (filter.sessionId && client.sessionId !== filter.sessionId) continue;
      if (
        filter.metadata &&
        !Object.entries(filter.metadata).every(
          ([k, v]) => client.metadata?.[k] === v,
        )
      )
        continue;
      clients.push(client);
    }
    return clients;
  }

  private formatEvent<T>(event: SSEEvent<T>): string {
    let message = "";
    if (event.id) message += `id: ${event.id}\n`;
    if (event.event) message += `event: ${event.event}\n`;
    if (event.retry) message += `retry: ${event.retry}\n`;
    const data =
      typeof event.data === "string" ? event.data : JSON.stringify(event.data);
    message +=
      data
        .split("\n")
        .map((line) => `data: ${line}`)
        .join("\n") + "\n\n";
    return message;
  }

  private generateClientId(): string {
    return `rt_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      const now = Date.now();
      const heartbeat: SSEEvent = { event: "ping", data: { timestamp: now } };
      for (const client of this.clients.values()) {
        if (this.sendToClient(client.id, heartbeat)) client.lastPing = now;
      }
      this.cleanupStaleClients();
    }, this.config.pingInterval);
  }

  private cleanupStaleClients(): void {
    const now = Date.now();
    for (const [clientId, client] of this.clients.entries()) {
      if (now - client.lastPing > this.config.clientTimeout) {
        this.disconnectClient(clientId);
      }
    }
  }

  destroy(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
    for (const clientId of this.clients.keys()) this.disconnectClient(clientId);
    this.clients.clear();
  }
}

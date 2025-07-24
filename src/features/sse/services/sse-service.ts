import { v4 as uuidv4 } from "uuid";
import type { SSEEvent } from "../types";

export interface SSEClient {
  id: string;
  controller: ReadableStreamDefaultController;
  userId?: string;
}

class SSEService {
  private clients: Map<string, SSEClient> = new Map<string, SSEClient>();
  private adminControllers: Set<ReadableStreamDefaultController> =
    new Set<ReadableStreamDefaultController>();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  addClient(
    controller: ReadableStreamDefaultController,
    userId?: string,
  ): string {
    const id = uuidv4();
    this.clients.set(id, { id, controller, userId });
    controller.enqueue(this.formatEvent({ event: "connected", data: { id } }));
    this.broadcastClients();
    this.broadcast({ event: "client-connect", data: { id } });
    this.ensureHeartbeat();
    return id;
  }

  addAdmin(controller: ReadableStreamDefaultController) {
    this.adminControllers.add(controller);
    controller.enqueue(
      this.formatEvent({
        event: "clients",
        data: { clients: this.getActiveClients() },
      }),
    );
  }

  removeClient(id: string) {
    const client = this.clients.get(id);
    if (client) {
      this.clients.delete(id);
      try {
        client.controller.close();
      } catch {}
      this.broadcastClients();
      this.broadcast({ event: "client-disconnect", data: { id } });
    }
    if (this.clients.size === 0 && this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  removeAdmin(controller: ReadableStreamDefaultController) {
    this.adminControllers.delete(controller);
    controller.close();
  }

  sendToClient(id: string, event: SSEEvent): boolean {
    const client = this.clients.get(id);
    if (client) {
      client.controller.enqueue(this.formatEvent(event));
      return true;
    }
    return false;
  }

  broadcast(event: SSEEvent, excludeId?: string): number {
    let count = 0;
    // If event is a broadcast with clientId, send to that client and all admins
    if (event.event === "broadcast" && event.data.clientId) {
      const clientId = event.data.clientId;
      if (typeof clientId === "string") {
        // Send to the specific client
        this.sendToClient(clientId, event);
      }
      // Also send to all admins
      for (const admin of this.adminControllers) {
        admin.enqueue(this.formatEvent(event));
      }
      return 1;
    }
    // Otherwise, send to all clients and all admins
    for (const [id, client] of this.clients.entries()) {
      if (excludeId && id === excludeId) continue;
      client.controller.enqueue(this.formatEvent(event));
      count++;
    }
    for (const admin of this.adminControllers) {
      admin.enqueue(this.formatEvent(event));
    }
    return count;
  }

  private ensureHeartbeat() {
    this.heartbeatInterval ??= setInterval(() => {
      this.broadcast({ event: "ping", data: {} });
    }, 3000);
  }

  private formatEvent(event: SSEEvent): Uint8Array {
    return new TextEncoder().encode(
      `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`,
    );
  }

  private broadcastClients() {
    const clientIds = Array.from(this.clients.keys());
    this.broadcast({ event: "clients", data: { clients: clientIds } });
  }

  getActiveClients(): string[] {
    return Array.from(this.clients.keys());
  }
}

export const sseService = new SSEService();

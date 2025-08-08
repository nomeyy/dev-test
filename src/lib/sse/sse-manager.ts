import { type NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  SSEEventEnum,
  type ConnectedEventData,
  type HeartbeatEventData,
} from "./types";

export type SSEClient = {
  id: string;
  userId?: string;
  response: NextResponse;
  controller: ReadableStreamController<Uint8Array>;
};

export type SSEEvent = {
  event: string;
  data: unknown;
  id?: string;
};

class SSEManager {
  private clients = new Map<string, SSEClient>();
  private userClients = new Map<string, Set<string>>();

  public handleConnection(request: NextRequest, userId?: string): NextResponse {
    const clientId = uuidv4();
    const stream = new ReadableStream({
      start: (controller) => {
        this.clients.set(clientId, {
          id: clientId,
          userId,
          response: NextResponse.next(),
          controller,
        });

        if (userId) {
          if (!this.userClients.has(userId)) {
            this.userClients.set(userId, new Set());
          }
          this.userClients.get(userId)?.add(clientId);
        }

        this.sendEventToClient(clientId, {
          event: SSEEventEnum.connected,
          data: {
            clientId,
            timestamp: Date.now(),
            userId,
          } as ConnectedEventData,
        });

        const heartbeatInterval = setInterval(() => {
          this.sendEventToClient(clientId, {
            event: SSEEventEnum.heartbeat,
            data: { timestamp: Date.now() } as HeartbeatEventData,
          });
        }, 30000);

        request.signal.addEventListener("abort", () => {
          this.removeClient(clientId);
          clearInterval(heartbeatInterval);
        });
      },
    });
    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  public sendEventToClient(clientId: string, event: SSEEvent): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;

    try {
      const message = this.formatSSEMessage(event);
      client.controller.enqueue(new TextEncoder().encode(message));
      return true;
    } catch (error) {
      console.error(`Error sending event to client ${clientId}:`, error);
      this.removeClient(clientId);
      return false;
    }
  }

  public sendEventToUser(userId: string, event: SSEEvent): number {
    const clientIds = this.userClients.get(userId);
    console.log("clientIds", clientIds);
    if (!clientIds) return 0;
    let successCount = 0;
    for (const clientId of clientIds) {
      if (this.sendEventToClient(clientId, event)) {
        successCount++;
      }
    }
    return successCount;
  }

  public broadcastEvent(event: SSEEvent): number {
    let successCount = 0;
    for (const clientId of this.clients.keys()) {
      if (this.sendEventToClient(clientId, event)) {
        successCount++;
      }
    }
    return successCount;
  }

  private removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;
    if (client.userId) {
      const userClientIds = this.userClients.get(client.userId);
      if (userClientIds) {
        userClientIds.delete(clientId);
        if (userClientIds.size === 0) {
          this.userClients.delete(client.userId);
        }
      }
    }
    this.clients.delete(clientId);
  }

  private formatSSEMessage(event: SSEEvent): string {
    let message = "";
    if (event.id) {
      message += `id: ${event.id}\n`;
    }
    if (event.event) {
      message += `event: ${event.event}\n`;
    }
    const data = JSON.stringify(event.data);
    message += `data: ${data}\n\n`;
    return message;
  }

  public getClientCount(): number {
    return this.clients.size;
  }

  public getUserCount(): number {
    return this.userClients.size;
  }
}

export const sseManager = new SSEManager();

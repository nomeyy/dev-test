import type {
  JsonSerializable,
  SSEClient,
  SSEClientId,
  SSEEventName,
  SSEPayload,
} from "@/features/sse";

class SSEManager {
  // For Development saving clients connections in memory, but in production it will be saved in redis
  private clientsConnections: Map<SSEClientId, Map<string, SSEClient>> =
    new Map();
  private heartbeatIntervalMs = 25000;

  // For change ping interval
  setHeartbeatInterval(ms: number) {
    this.heartbeatIntervalMs = Math.max(5000, ms);
  }

  getActiveClientCount(): number {
    let total = 0;
    for (const clients of this.clientsConnections.values()) {
      total += clients.size;
    }
    return total;
  }

  createClientConnection(clientId: SSEClientId) {
    const connectionId = crypto.randomUUID();
    const encoder = new TextEncoder();

    let isClosed = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    // Create SSE stream
    const stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        // Write SSE function for write messages to client
        const write = (payload: SSEPayload) => {
          if (isClosed) return;
          const { event, data } = payload;
          const lines = [
            `event: ${event}`,
            "\n",
            `data: ${JSON.stringify(data)}`,
            "\n",
            "",
          ]
            .filter(Boolean)
            .join("\n");

          try {
            controller.enqueue(encoder.encode(`${lines}\n`));
          } catch (error) {
            console.error("[SSE] enqueue error", {
              clientId,
              connectionId,
              error,
            });
            isClosed = true;
            try {
              controller.close();
            } catch (e) {
              console.error("[SSE] close error", {
                clientId,
                connectionId,
                error: e,
              });
            }
            if (interval) {
              clearInterval(interval);
              interval = null;
            }
            // remove client from list
            this.removeClient(clientId, connectionId);
          }
        };

        const close = () => {
          if (isClosed) return;
          isClosed = true;
          try {
            controller.close();
          } catch {}
          if (interval) {
            clearInterval(interval);
            interval = null;
          }
          this.removeClient(clientId, connectionId);
        };

        const sseClient: SSEClient = {
          id: connectionId,
          clientId,
          write,
          close,
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
        };

        const group = this.clientsConnections.get(clientId) ?? new Map();
        group.set(connectionId, sseClient);
        this.clientsConnections.set(clientId, group);

        // Initial hello to confirm channel open
        write({ event: "open", data: { connectionId, clientId } });

        // Heartbeat pings
        interval = setInterval(() => {
          try {
            write({ event: "ping", data: Date.now() });
          } catch {
            // cleanup in write error path
          }
        }, this.heartbeatIntervalMs);
      },
      cancel: () => {
        if (isClosed) return;
        isClosed = true;
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
        this.removeClient(clientId, connectionId);
      },
    });

    return {
      stream,
      connectionId,
    };
  }

  removeClient(clientId: SSEClientId, connectionId: string) {
    const group = this.clientsConnections.get(clientId);
    if (!group) return;
    group.delete(connectionId);
    if (group.size === 0) this.clientsConnections.delete(clientId);
  }

  sendToClient(
    clientId: SSEClientId,
    event: SSEEventName,
    data: JsonSerializable,
  ) {
    const group = this.clientsConnections.get(clientId);

    if (!group) return 0;
    let delivered = 0;
    for (const client of group.values()) {
      // receiving client form Map list of clients and send message
      try {
        client.write({ event, data });
        delivered += 1;
      } catch (error) {
        console.error("[SSE] sendToClient error", {
          clientId,
          connectionId: client.id,
          error,
        });
        this.removeClient(clientId, client.id);
      }
    }
    return delivered;
  }

  broadcast(event: SSEEventName, data: JsonSerializable) {
    let delivered = 0;
    for (const group of this.clientsConnections.values()) {
      for (const client of group.values()) {
        // receiving client form Map list of clients and send message
        try {
          client.write({ event, data });
          delivered += 1;
        } catch (error) {
          console.error("[SSE] broadcast error (client)", {
            clientId: client.clientId,
            connectionId: client.id,
            error,
          });
          this.removeClient(client.clientId, client.id);
        }
      }
    }
    return delivered;
  }
}

export const sseManager = new SSEManager();

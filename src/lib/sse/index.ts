import { chunkArray, createServiceContext } from "@/utils/service-utils";
import type { SSEClient } from "./types";
const { log, handleError } = createServiceContext("ReelActions");

class SSEManager {
  private clients = new Map<string, SSEClient>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL_MS = 30_000; // 30 seconds

  addClient(id: string, client: SSEClient) {
    this.clients.set(id, client);
    if (!this.heartbeatInterval) {
      this.startHeartbeat();
    }
  }

  removeClient(id: string) {
    this.clients.delete(id);
    if (this.clients.size === 0) {
      this.stopHeartbeat();
    }
  }

  async sendToUser(id: string, event: string, data: Record<string, string>) {
    const client = this.clients.get(id);
    if (client) {
      await client.write(`event: ${event}\n`);
      await client.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  }

  async broadcast(
    event: string,
    data: Record<string, string>,
    chunkSize = 20,
  ): Promise<void> {
    const clients = Array.from(this.clients.entries());
    const chunks = chunkArray(clients, chunkSize);
    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async ([clientId, client]) => {
          try {
            await client.write(`event: ${event}\n`);
            await client.write(`data: ${JSON.stringify(data)}\n\n`);
          } catch (error) {
            handleError(
              `[SSEManager] Failed to write to client ${clientId}`,
              error,
            );
            this.removeClient(clientId);
          }
        }),
      );
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) return;
    this.heartbeatInterval = setInterval(() => {
      (async () => {
        for (const [id, client] of this.clients.entries()) {
          try {
            await client.write(`:ping\n\n`);
          } catch (err) {
            handleError(`[SSEManager] Heartbeat failed for client ${id}`, err);
            this.removeClient(id);
          }
        }
      })().catch((error) =>
        handleError("Error while starting the heartbeat", error),
      );
    }, this.HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

declare global {
  var _sseManager: SSEManager | undefined;
}

globalThis._sseManager = globalThis._sseManager ?? new SSEManager();

export const sseManager = globalThis._sseManager;
export { log as sseLogs, handleError as sseHandleError };

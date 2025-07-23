// SSE Manager: Handles client connections, event dispatch, and lifecycle
import type { NextApiResponse } from "next";

export type SSEClient = {
  id: string;
  res: NextApiResponse;
};

class SSEManager {
  private clients: Map<string, SSEClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  addClient(id: string, res: NextApiResponse) {
    this.clients.set(id, { id, res });
    this.startHeartbeat();
  }

  removeClient(id: string) {
    this.clients.delete(id);
    if (this.clients.size === 0) this.stopHeartbeat();
  }

  sendEvent(id: string, event: string, data: any) {
    const client = this.clients.get(id);
    if (client) {
      try {
        client.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      } catch (err) {
        console.error(`[SSE] Error sending event to client ${id}:`, err);
      }
    } else {
      console.warn(`[SSE] Tried to send event to non-existent client: ${id}`);
    }
  }

  broadcast(event: string, data: any) {
    for (const client of this.clients.values()) {
      try {
        client.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      } catch (err) {
        console.error(
          `[SSE] Error broadcasting event to client ${client.id}:`,
          err,
        );
      }
    }
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) return;
    this.heartbeatInterval = setInterval(() => {
      for (const client of this.clients.values()) {
        client.res.write(`event: ping\ndata: {}\n\n`);
      }
    }, 25000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  getClientCount() {
    return this.clients.size;
  }
}

export const sseManager = new SSEManager();

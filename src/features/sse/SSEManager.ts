// SSEManager.ts
// Centralized manager for user-based Server-Sent Events (SSE)
import type { Writable } from 'stream';

export type SSEClient = {
  userId: string;
  res: {
    write: (chunk: string) => void;
    end: () => void;
  };
  lastActive: number;
};

class SSEManager {
  private clients: Map<string, Set<SSEClient>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_MS = 25000;

  constructor() {
    this.startHeartbeat();
  }

  addClient(userId: string, res: { write: (chunk: string) => void; end: () => void }) {
    const client: SSEClient = { userId, res, lastActive: Date.now() };
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId)!.add(client);
    return client;
  }

  removeClient(userId: string, res: { write: (chunk: string) => void; end: () => void }) {
    const set = this.clients.get(userId);
    if (set) {
      for (const client of set) {
        if (client.res === res) {
          set.delete(client);
        }
      }
      if (set.size === 0) {
        this.clients.delete(userId);
      }
    }
  }

  sendEvent(userId: string, event: string, data: unknown) {
    const set = this.clients.get(userId);
    if (!set) return;
    for (const client of set) {
      this.writeEvent(client.res, event, data);
    }
  }

  broadcastEvent(event: string, data: unknown) {
    for (const set of this.clients.values()) {
      for (const client of set) {
        this.writeEvent(client.res, event, data);
      }
    }
  }

  private writeEvent(res: { write: (chunk: string) => void; end: () => void }, event: string, data: unknown) {
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      // Ignore write errors (client may have disconnected)
      // Add error logging
      console.error('[SSEManager] Failed to write event:', event, err);
    }
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) return;
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      for (const [userId, set] of this.clients.entries()) {
        for (const client of set) {
          try {
            client.res.write(`event: ping\ndata: {}\n\n`);
            client.lastActive = now;
          } catch (err) {
            set.delete(client);
            // Add error logging
            console.error('[SSEManager] Heartbeat failed, removing client:', userId, err);
          }
        }
        if (set.size === 0) {
          this.clients.delete(userId);
        }
      }
    }, this.HEARTBEAT_MS);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

export const sseManager = new SSEManager(); 
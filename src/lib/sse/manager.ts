// lib/sse/manager.ts
type Client = {
  id: string;
  controller: ReadableStreamDefaultController;
};

class SSEManager {
  private clients = new Map<string, Client>();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  addClient(id: string, controller: ReadableStreamDefaultController) {
    this.clients.set(id, { id, controller });
    console.log(
      `✅ Client ${id} connected. Total clients: ${this.clients.size}`,
    );
  }

  removeClient(id: string) {
    const client = this.clients.get(id);
    if (client) {
      try {
        client.controller.close();
      } catch {
        // Client may already be closed
      }
      this.clients.delete(id);
      console.log(
        `❌ Client ${id} disconnected. Total clients: ${this.clients.size}`,
      );
    }
  }

  sendEvent(id: string, event: string, data: unknown) {
    const client = this.clients.get(id);
    if (!client) {
      console.warn(`⚠️ Attempted to send to non-existent client: ${id}`);
      return false;
    }

    try {
      const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      client.controller.enqueue(new TextEncoder().encode(message));
      return true;
    } catch (error) {
      console.error(`❌ Error sending event to client ${id}:`, error);
      this.removeClient(id);
      return false;
    }
  }

  broadcast(event: string, data: unknown) {
    const clientIds = Array.from(this.clients.keys());
    let successCount = 0;

    for (const clientId of clientIds) {
      if (this.sendEvent(clientId, event, data)) {
        successCount++;
      }
    }

    console.log(
      `📡 Broadcasted '${event}' to ${successCount}/${clientIds.length} clients`,
    );
    return successCount;
  }

  getClientCount(): number {
    return this.clients.size;
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.clients.size > 0) {
        this.broadcast("ping", { timestamp: Date.now() });
      }
    }, 20_000); // every 20 seconds
  }

  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Close all client connections
    for (const client of this.clients.values()) {
      try {
        client.controller.close();
      } catch {
        // Ignore errors during cleanup
      }
    }
    this.clients.clear();
  }
}

// Global singleton instance
const sseManager = new SSEManager();

// Cleanup on process exit
process.on("exit", () => sseManager.cleanup());
process.on("SIGINT", () => {
  sseManager.cleanup();
  process.exit(0);
});
process.on("SIGTERM", () => {
  sseManager.cleanup();
  process.exit(0);
});

export default sseManager;

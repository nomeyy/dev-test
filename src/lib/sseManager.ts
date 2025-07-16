// src/lib/sseManager.ts

type SSEClient = {
  write: (data: string) => void;
  close: () => void;
};

class SSEManager {
  private clients = new Map<string, SSEClient>();

  addClient(id: string, client: SSEClient) {
    this.clients.set(id, client);
    client.write(`event: connected\ndata: Client ${id} connected\n\n`);
  }

  removeClient(id: string) {
    this.clients.delete(id);
  }

  sendToClient(id: string, event: string, data: any) {
    const client = this.clients.get(id);
    if (!client) {
      console.warn(`⚠️ No client found with ID: ${id}`);
      return;
    }

    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    client.write(payload);
  }

  broadcast(event: string, data: any) {
    for (const client of this.clients.values()) {
      client.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }
  }

  constructor() {
    setInterval(() => {
      this.broadcast("ping", {});
    }, 15000); // Heartbeat ping
  }
}

export const sseManager = new SSEManager();

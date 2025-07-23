type Client = {
  id: string;
  write: (chunk: string) => void;
};

class SSEManager {
  clients: Map<string, Client> = new Map();

  addClient(id: string, client: Client) {
    this.clients.set(id, client);
  }

  removeClient(id: string) {
    this.clients.delete(id);
  }

  sendEvent(id: string, event: string, data: any) {
    const client = this.clients.get(id);
    if (client) {
      client.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }
  }

  broadcast(event: string, data: any) {
    for (const client of this.clients.values()) {
      client.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }
  }

  heartbeat() {
    for (const client of this.clients.values()) {
      client.write(`event: ping\ndata: {}\n\n`);
    }
  }
}
setInterval(() => sseManager.heartbeat(), 25000);

export const sseManager = new SSEManager();

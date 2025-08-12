type SSEClient = {
  id: string;
  write: (chunk: string) => Promise<void>;
  end: () => void;
};

class SSEManager {
  private clients = new Map<string, SSEClient[]>();

  addClient(id: string, client: SSEClient) {
    if (!this.clients.has(id)) this.clients.set(id, []);
    this.clients.get(id)!.push(client);
  }

  removeClient(id: string, client: SSEClient) {
    if (!this.clients.has(id)) return;
    const clients = this.clients.get(id)!;
    const idx = clients.indexOf(client);
    if (idx !== -1) clients.splice(idx, 1);
    if (clients.length === 0) this.clients.delete(id);
  }

  async sendEvent(id: string, event: string, data: any) {
    if (!this.clients.has(id)) return;
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.clients.get(id)!) {
      try {
        await client.write(payload);
      } catch {
        this.removeClient(id, client);
      }
    }
  }

  async broadcast(event: string, data: any) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const clients of this.clients.values()) {
      for (const client of clients) {
        try {
          await client.write(payload);
        } catch {
          this.removeClient(client.id, client);
        }
      }
    }
  }
}

export default new SSEManager();

type SSEWriter = {
  write: (payload: string) => void;
  close: () => void;
};

class SSEManager {
  private clients: Map<string, SSEWriter[]> = new Map();

  addClient(userId: string, writer: SSEWriter) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, []);
    }
    this.clients.get(userId)!.push(writer);
  }

  removeClient(userId: string) {
    const writers = this.clients.get(userId);
    if (writers) {
      writers.forEach((writer) => writer.close());
      this.clients.delete(userId);
    }
  }

  sendToUser(userId: string, event: string, data: any) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    this.clients.get(userId)?.forEach((writer) => writer.write(payload));
  }

  broadcast(event: string, data: any) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const writers of this.clients.values()) {
      writers.forEach((writer) => writer.write(payload));
    }
  }

  heartbeat() {
    const ping = `event: ping\ndata: ${Date.now()}\n\n`;
    for (const writers of this.clients.values()) {
      writers.forEach((writer) => writer.write(ping));
    }
  }
}

export const sseManager = new SSEManager();

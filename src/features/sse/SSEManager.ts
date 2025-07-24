import { v4 as uuidv4 } from "uuid";

export interface SSEWriter {
  write: (data: string) => void | Promise<void>;
  close: () => void | Promise<void>;
}

export type SSEClient = {
  id: string;
  writer: SSEWriter;
  userId?: string;
};

export class SSEManager {
  private clients: Map<string, SSEClient> = new Map<string, SSEClient>();

  addClient(writer: SSEWriter, userId?: string): string {
    const id = uuidv4();
    const client: SSEClient = { id, writer, userId };
    this.clients.set(id, client);
    return id;
  }

  removeClient(id: string) {
    this.clients.delete(id);
  }

  async sendEventToClient(id: string, event: string, data: unknown) {
    const client = this.clients.get(id);
    if (client) {
      await client.writer.write(
        `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
      );
    }
  }

  async broadcastEvent(event: string, data: unknown) {
    for (const client of this.clients.values()) {
      await client.writer.write(
        `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
      );
    }
  }

  async sendEventToUser(userId: string, event: string, data: unknown) {
    for (const client of this.clients.values()) {
      if (client.userId === userId) {
        await client.writer.write(
          `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
        );
      }
    }
  }

  async heartbeat() {
    for (const client of this.clients.values()) {
      await client.writer.write(`event: ping\ndata: {}\n\n`);
    }
  }

  getClientCount() {
    return this.clients.size;
  }
}

// Singleton instance
export const sseManager = new SSEManager();

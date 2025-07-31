type SSEClient = {
  clientId: string;
  userId: string;
  writer: WritableStreamDefaultWriter<Uint8Array>;
};

class SSEManager {
  private clients: SSEClient[] = [];
  private eventLog: string[] = [];

  addClient(client: SSEClient) {
    this.clients.push(client);
    this.addLog(`User ${client.userId} connected`);
    this.broadcastStats();
  }

  removeClient(clientId: string) {
    const client = this.clients.find((c) => c.clientId === clientId);
    if (client) {
      this.addLog(`User ${client.userId} disconnected`);
    }
    this.clients = this.clients.filter((c) => c.clientId !== clientId);
    this.broadcastStats();
  }

  sendToUser(userId: string, event: string, data: any) {
    const encoder = new TextEncoder();
    const chunk = encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    const connections = this.clients.filter((c) => c.userId === userId);
    connections.forEach((c) => c.writer.write(chunk));
    this.addLog(`Sent '${event}' event to user ${userId}`);
    this.broadcastStats();
  }

  broadcast(event: string, data: any) {
    const encoder = new TextEncoder();
    const chunk = encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    this.clients.forEach((c) => c.writer.write(chunk));
    this.addLog(`Broadcasted '${event}' event to ${this.clients.length} connection(s)`);
    this.broadcastStats();
  }

  stats() {
    const users = new Set(this.clients.map((c) => c.userId)).size;
    const connections = this.clients.length;
    return { users, connections, log: this.eventLog.slice(-50) }; // last 50 logs
  }

  private addLog(message: string) {
    this.eventLog.push(`${new Date().toLocaleTimeString()} - ${message}`);
  }

  private broadcastStats() {
    const encoder = new TextEncoder();
    const stats = this.stats();
    const chunk = encoder.encode(`event: stats\ndata: ${JSON.stringify(stats)}\n\n`);
    this.clients.forEach((c) => c.writer.write(chunk));
  }
}

export const sseManager = new SSEManager();

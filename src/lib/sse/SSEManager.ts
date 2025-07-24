import type { ServerResponse } from "http";

type SSEClient = {
  id: string;
  res: ServerResponse;
  events: Set<string>;
};

class SSEManager {
  private clients = new Map<string, SSEClient>();
  private heartbeatInterval: NodeJS.Timeout;

  constructor() {
    this.heartbeatInterval = setInterval(this.sendHeartbeat.bind(this), 10000);
  }

  addClient(id: string, res: ServerResponse, events: string[] = []) {
    if (this.clients.has(id)) {
      console.warn(`Client with id ${id} already connected. Overwriting.`);
    }
    const checkingClients = this.clients.set(id, {
      id,
      res,
      events: new Set(events),
    });
    console.log("Client added:", id, checkingClients);
    res.write("\n");
  }

  removeClient(id: string) {
    this.clients.delete(id);
  }

  sendEvent(id: string, event: string, data: string) {
    const client = this.clients.get(id);
    console.log("📡 Connected clients:", Array.from(this.clients.keys()));

    if (!client) {
      console.warn(`⚠️ No active SSE client with id: ${id}`);
      console.log("Current clients:", Array.from(this.clients.keys()));
      return;
    }

    try {
      if (event === "message") {
        // For default message event, send only data without event: line
        client.res.write(`data: ${JSON.stringify(data)}\n\n`);
        console.log(`✅ Message sent to ${id}:`, data); //
      } else {
        // For custom events, send event: and data:
        client.res.write(`event: ${event}\n`);
        client.res.write(`data: ${JSON.stringify(data)}\n\n`);
      }
    } catch (e) {
      console.error(`Failed to send event to client ${id}:`, e);
      this.removeClient(id);
    }
  }

  sendEventToTopic(id: string, event: string, data: string) {
    this.clients.forEach(({ res, events }) => {
      if (events.has(event)) {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      }
    });
  }

  broadcast(event: string, data: string) {
    for (const [id] of this.clients) {
      this.sendEvent(id, event, data);
    }
  }

  subscribeToEvent(clientId: string, event: string) {
    this.clients.get(clientId)?.events.add(event);
  }

  unsubscribeFromEvent(clientId: string, event: string) {
    this.clients.get(clientId)?.events.delete(event);
  }

  sendHeartbeat() {
    for (const [, client] of this.clients) {
      try {
        client.res.write(`event: heartbeat\ndata: {}\n\n`);
      } catch {
        this.removeClient(client.id);
      }
    }
  }

  getClientCount() {
    return this.clients.size;
  }

  // getClientTopics(clientId: string): string[] {
  //   return Array.from(this.clients.get(clientId)?.events ?? []);
  // }

  cleanup() {
    clearInterval(this.heartbeatInterval);
    this.clients.clear();
  }
}

export const sseManager = new SSEManager();

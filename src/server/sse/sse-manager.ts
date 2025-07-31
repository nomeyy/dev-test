export type SSEClient = {
  userId: string;
  writer: WritableStreamDefaultWriter;
};

class SSEManager {
  private clients: Map<string, SSEClient> = new Map();
  private heartbeats: Map<string, NodeJS.Timeout> = new Map();

  connect(userId: string, writer: WritableStreamDefaultWriter): SSEClient {
    const client: SSEClient = { userId, writer };
    this.clients.set(userId, client);
    for (const c of this.clients.values()) {
      console.log("🧾 Connected client:", {
        userId: c.userId,
        writerOpen: !!c.writer,
      });
    }

    const heartbeat = setInterval(() => {
      try {
        writer.write(new TextEncoder().encode("event: ping\ndata: {}\n\n"));
      } catch (e) {
        console.error("❌ Heartbeat failed for user:", userId, e);
        this.disconnect(userId);
      }
    }, 20000);
    this.heartbeats.set(userId, heartbeat);

    return client;
  }

  disconnect(userId: string) {
    const client = this.clients.get(userId);
    if (!client) {
      console.warn("⚠️ Tried to disconnect unknown user:", userId);
      return;
    }
    try {
      client.writer.close();
    } catch (e) {
      console.warn(
        "⚠️ Writer already closed or failed to close for:",
        userId,
        e,
      );
    }
    clearInterval(this.heartbeats.get(userId));
    this.heartbeats.delete(userId);
    this.clients.delete(userId);

    console.log("❎ Disconnected client:", userId);
  }

  sendToUser(userId: string, event: string, data: any) {
    const encoded = new TextEncoder().encode(
      `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
    );
    for (const client of this.clients.values()) {
      if (client.userId === userId) {
        try {
          client.writer.write(encoded);
          console.log(`📨 Sent [${event}] to user:`, userId);
        } catch (err) {
          console.error("❌ Failed to write to client:", userId, err);
        }
      } else {
        console.warn("❌ No active SSE connection found for user:", userId);
      }
    }
  }

  broadcast(event: string, data: any) {
    const encoded = new TextEncoder().encode(
      `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
    );
    console.log(`📢 Broadcasting [${event}] to ${this.clients.size} clients`);
    for (const client of this.clients.values()) {
      try {
        client.writer.write(encoded);
        console.log("✅ Written to:", client?.userId);
      } catch (err) {
        console.error("❌ Failed to write to client", client?.userId, err);
      }
    }
  }
}

let _sseManager: SSEManager;

declare global {
  var sseManager: SSEManager;
}

if (!globalThis.sseManager) {
  globalThis.sseManager = new SSEManager();
}

_sseManager = globalThis.sseManager;

export const sseManager = _sseManager;

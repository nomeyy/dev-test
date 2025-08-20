import type { SSEMessage } from "./sseTypes";

type Connection = {
  id: string;
  clientId: string;
  send: (chunk: string) => void;
  close: () => void;
};

class SSEManager {
  private connections = new Map<string, Set<Connection>>();
  private heartbeatIntervalMs = 25_000; // 25s (configurable)

  constructor() {}

  subscribe(clientId: string, conn: Connection) {
    const set = this.connections.get(clientId) ?? new Set<Connection>();
    set.add(conn);
    this.connections.set(clientId, set);
  }

  unsubscribe(clientId: string, conn: Connection) {
    const set = this.connections.get(clientId);
    if (!set) return;
    set.delete(conn);
    try {
      conn.close();
    } catch (e) {
      /* ignore */
    }
    if (set.size === 0) this.connections.delete(clientId);
  }

  sendToClient(clientId: string, msg: SSEMessage) {
    const set = this.connections.get(clientId);
    if (!set) return 0;
    const payload = this.formatMessage(msg);
    let sent = 0;
    for (const c of Array.from(set)) {
      try {
        c.send(payload);
        sent++;
      } catch (e) {
        this.unsubscribe(clientId, c);
      }
    }
    return sent;
  }

  broadcast(msg: SSEMessage) {
    const payload = this.formatMessage(msg);
    let sent = 0;
    for (const [clientId, set] of Array.from(this.connections.entries())) {
      for (const c of Array.from(set)) {
        try {
          c.send(payload);
          sent++;
        } catch (e) {
          this.unsubscribe(clientId, c);
        }
      }
    }
    return sent;
  }

  listClients() {
    return Array.from(this.connections.keys());
  }

  private formatMessage(msg: SSEMessage) {
    let out = "";
    if (msg.id)
      out += `id: ${msg.id}
`;
    if (msg.event)
      out += `event: ${msg.event}
`;
    const dataStr =
      typeof msg.data === "string" ? msg.data : JSON.stringify(msg.data);
    const lines = dataStr.split("");
    for (const line of lines) out += `data: ${line}`;
    if (typeof msg.retry === "number") out += `retry: ${msg.retry}`;
    out += "";
    return out;
  }
}

export const sseManager = new SSEManager();
export default sseManager;

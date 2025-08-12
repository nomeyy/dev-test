import { randomUUID } from "crypto";

type Connection = {
  connectionId: string;
  userId: string;
  writer: WritableStreamDefaultWriter<Uint8Array>;
  heartbeatTimer?: ReturnType<typeof setInterval>;
};

class SSEManager {
  private encoder = new TextEncoder();

  private userConnections = new Map<string, Map<string, Connection>>();
  private allConnections = new Map<string, Connection>();

  private heartbeatIntervalMs = 15_000;

  addClient(
    userId: string,
    writer: WritableStreamDefaultWriter<Uint8Array>,
    options?: { connectionId?: string; enableHeartbeat?: boolean },
  ): string {
    const connectionId = options?.connectionId ?? randomUUID();

    const connection: Connection = {
      connectionId,
      userId,
      writer,
    };

    const existingForUser: Map<string, Connection> =
      this.userConnections.get(userId) ?? new Map<string, Connection>();
    existingForUser.set(connectionId, connection);
    this.userConnections.set(userId, existingForUser);

    this.allConnections.set(connectionId, connection);

    if (options?.enableHeartbeat !== false) {
      connection.heartbeatTimer = setInterval(() => {
        const payload = { timestamp: Date.now(), connectionId };
        const bytes = this.formatEvent("ping", payload);
        void writer.write(bytes).catch(() => {
          this.removeConnection(connectionId);
        });
      }, this.heartbeatIntervalMs);
    }

    return connectionId;
  }

  removeConnection(connectionId: string): void {
    const connection = this.allConnections.get(connectionId);
    if (!connection) return;

    const { userId, heartbeatTimer, writer } = connection;
    if (heartbeatTimer) clearInterval(heartbeatTimer);

    const userMap = this.userConnections.get(userId);
    if (userMap) {
      userMap.delete(connectionId);
      if (userMap.size === 0) this.userConnections.delete(userId);
    }

    this.allConnections.delete(connectionId);

    void writer.close().catch(() => undefined);
  }

  removeAllForUser(userId: string): void {
    const userMap = this.userConnections.get(userId);
    if (!userMap) return;
    for (const connectionId of userMap.keys()) {
      this.removeConnection(connectionId);
    }
  }

  broadcast<EventPayload>(eventName: string, payload: EventPayload): void {
    const bytes = this.formatEvent(eventName, payload);
    for (const connection of this.allConnections.values()) {
      void connection.writer.write(bytes).catch(() => {
        this.removeConnection(connection.connectionId);
      });
    }
  }

  sendToUser<EventPayload>(
    userId: string,
    eventName: string,
    payload: EventPayload,
  ): void {
    const userMap = this.userConnections.get(userId);
    if (!userMap || userMap.size === 0) return;

    const bytes = this.formatEvent(eventName, payload);
    for (const connection of userMap.values()) {
      void connection.writer.write(bytes).catch(() => {
        this.removeConnection(connection.connectionId);
      });
    }
  }

  sendToUsers<EventPayload>(
    userIds: string[],
    eventName: string,
    payload: EventPayload,
  ): void {
    for (const userId of userIds) {
      this.sendToUser(userId, eventName, payload);
    }
  }

  sendToAll(message: string): void {
    this.broadcast("message", message);
  }

  private formatEvent(eventName: string, payload: unknown): Uint8Array {
    const eventHeader =
      eventName && eventName !== "message" ? `event: ${eventName}\n` : "";
    const dataLine = `data: ${JSON.stringify(payload)}\n\n`;
    return this.encoder.encode(`${eventHeader}${dataLine}`);
  }
}

export const sseManager = new SSEManager();

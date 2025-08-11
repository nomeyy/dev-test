import { randomUUID } from "node:crypto";
import { TextEncoder } from "node:util";
import type {
  ClientId,
  ConnectionId,
  EmitTarget,
  SendOptions,
  SseConnection,
  SseEventPayload,
} from "./types";

const encoder = new TextEncoder();

function formatSseEvent(event: string, data: SseEventPayload): Uint8Array {
  const json = typeof data === "string" ? data : JSON.stringify(data);
  return encoder.encode(`event: ${event}\n` + `data: ${json}\n\n`);
}

function formatSseComment(comment: string): Uint8Array {
  return encoder.encode(`: ${comment}\n\n`);
}

class SseManagerImpl {
  private connectionIdToConnection = new Map<ConnectionId, SseConnection>();
  private clientIdToConnectionIds = new Map<ClientId, Set<ConnectionId>>();
  private userIdToConnectionIds = new Map<string, Set<ConnectionId>>();
  private heartbeatIntervalMs = 25_000; // keep-alive pings

  addConnection(params: {
    clientId: ClientId;
    userId?: string;
    enqueue: (chunk: Uint8Array) => void;
    close: () => void;
  }): SseConnection {
    const connectionId = randomUUID();
    const connection: SseConnection = {
      connectionId,
      clientId: params.clientId,
      userId: params.userId,
      enqueue: params.enqueue,
      close: params.close,
      createdAt: Date.now(),
    };

    this.connectionIdToConnection.set(connectionId, connection);

    const byClient = this.clientIdToConnectionIds.get(connection.clientId) ?? new Set<ConnectionId>();
    byClient.add(connectionId);
    this.clientIdToConnectionIds.set(connection.clientId, byClient);

    if (connection.userId) {
      const byUser = this.userIdToConnectionIds.get(connection.userId) ?? new Set<ConnectionId>();
      byUser.add(connectionId);
      this.userIdToConnectionIds.set(connection.userId, byUser);
    }

    connection.enqueue(formatSseComment(`connected ${connectionId}`));

    return connection;
  }

  removeConnection(connectionId: ConnectionId): void {
    const connection = this.connectionIdToConnection.get(connectionId);
    if (!connection) return;

    this.connectionIdToConnection.delete(connectionId);

    const byClient = this.clientIdToConnectionIds.get(connection.clientId);
    if (byClient) {
      byClient.delete(connectionId);
      if (byClient.size === 0) this.clientIdToConnectionIds.delete(connection.clientId);
    }

    if (connection.userId) {
      const byUser = this.userIdToConnectionIds.get(connection.userId);
      if (byUser) {
        byUser.delete(connectionId);
        if (byUser.size === 0) this.userIdToConnectionIds.delete(connection.userId);
      }
    }

    try {
      connection.close();
    } catch {
      
    }
  }

  send<T extends SseEventPayload>({ event, data }: SendOptions<T>, targets?: EmitTarget): number {
    const targetIds = this.resolveTargets(targets);
    let sent = 0;
    const chunk = formatSseEvent(event, data);
    for (const id of targetIds) {
      const conn = this.connectionIdToConnection.get(id);
      if (!conn) continue;
      try {
        conn.enqueue(chunk);
        sent++;
      } catch {
        this.removeConnection(id);
      }
    }
    return sent;
  }

  broadcast<T extends SseEventPayload>({ event, data }: SendOptions<T>): number {
    const chunk = formatSseEvent(event, data);
    let sent = 0;
    for (const [id, conn] of this.connectionIdToConnection.entries()) {
      try {
        conn.enqueue(chunk);
        sent++;
      } catch {
        this.removeConnection(id);
      }
    }
    return sent;
  }

  startHeartbeat(connectionId: ConnectionId): NodeJS.Timeout {
    return setInterval(() => {
      const conn = this.connectionIdToConnection.get(connectionId);
      if (!conn) return;
      try {
        conn.enqueue(formatSseComment("ping"));
      } catch {
        this.removeConnection(connectionId);
      }
    }, this.heartbeatIntervalMs);
  }

  private resolveTargets(targets?: EmitTarget): Set<ConnectionId> {
    if (!targets) return new Set(this.connectionIdToConnection.keys());
    const ids = new Set<ConnectionId>();

    if (targets.clientId) {
      const byClient = this.clientIdToConnectionIds.get(targets.clientId);
      if (byClient) for (const id of byClient) ids.add(id);
    }

    if (targets.userId) {
      const byUser = this.userIdToConnectionIds.get(targets.userId);
      if (byUser) for (const id of byUser) ids.add(id);
    }

    return ids;
  }
}

declare global {
  var __sseManager__: SseManagerImpl | undefined;
}

export const SseManager: SseManagerImpl = global.__sseManager__ ?? (global.__sseManager__ = new SseManagerImpl());

export const SseHelpers = {
  emitToClient<T extends SseEventPayload>(clientId: ClientId, options: SendOptions<T>): number {
    return SseManager.send(options, { clientId });
  },
  emitToUser<T extends SseEventPayload>(userId: string, options: SendOptions<T>): number {
    return SseManager.send(options, { userId });
  },
  broadcast<T extends SseEventPayload>(options: SendOptions<T>): number {
    return SseManager.broadcast(options);
  },
}; 
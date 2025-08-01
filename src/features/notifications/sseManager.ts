// src/features/notifications/sseManager/index.ts

type SSEConnection = {
  connectionId: string;
  userId: string;
  res: ResponseStream;
  lastSeen: number;
};

type ResponseStream = {
  write: (chunk: string) => void;
  close: () => void;
};

export type ConnectionSnapshot = Record<string, string[]>; // userId -> [connectionId...]

class SSEManager {
  private connections = new Map<string, Map<string, SSEConnection>>();
  private heartbeatInterval: ReturnType<typeof setInterval>;
  private cleanupInterval: ReturnType<typeof setInterval>;
  private STALE_THRESHOLD = 60_000;

  constructor() {
    // ping to keep alive
    this.heartbeatInterval = setInterval(() => {
      this.connections.forEach((connMap) => {
        for (const conn of connMap.values()) {
          try {
            this.sendComment(conn, "ping");
          } catch (e) {
            console.warn("Failed ping write, removing connection", e);
            this.removeConnection(conn.userId, conn.connectionId);
          }
        }
      });
    }, 15_000);

    // prune stale
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      this.connections.forEach((connMap, userId) => {
        for (const [connectionId, conn] of connMap.entries()) {
          if (now - conn.lastSeen > this.STALE_THRESHOLD) {
            console.log(
              `Pruning stale SSE connection: ${userId}/${connectionId}`,
            );
            this.removeConnection(userId, connectionId);
          }
        }
      });
    }, 30_000);
  }

  registerConnection(userId: string, conn: SSEConnection) {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Map());
    }
    this.connections.get(userId)!.set(conn.connectionId, conn);
    console.log(
      `Registered SSE connection for user=${userId} id=${conn.connectionId}`,
    );
  }

  removeConnection(userId: string, connectionId: string) {
    const userMap = this.connections.get(userId);
    if (!userMap) return;
    const conn = userMap.get(connectionId);
    if (conn) {
      try {
        conn.res.close();
      } catch {}
    }
    userMap.delete(connectionId);
    if (userMap.size === 0) this.connections.delete(userId);
    console.log(`Removed SSE connection for user=${userId} id=${connectionId}`);
  }

  // send to one user (all their active connections)
  sendEvent(userId: string, name: string, payload: any) {
    const userMap = this.connections.get(userId);
    if (!userMap) {
      console.warn(
        `No active SSE connections for user=${userId}; dropping event ${name}`,
      );
      return;
    }
    
    console.log("TESTING");
    console.log(
      `Sending event "${name}" to user=${userId} on ${userMap.size} connection(s)`,
    );
    for (const conn of userMap.values()) {
      try {
        console.log("TESTING1");
        this.write(conn, name, payload);
      } catch (e) {
        console.warn("Error writing event, removing connection", e);
        this.removeConnection(userId, conn.connectionId);
      }
    }
  }

  // send to multiple userIds
  sendEvents(userIds: string[], name: string, payload: any) {
    userIds.forEach((uid) => this.sendEvent(uid, name, payload));
  }

  // global broadcast
  broadcastEvent(name: string, payload: any) {
    this.connections.forEach((userMap) => {
      for (const conn of userMap.values()) {
        try {
          this.write(conn, name, payload);
        } catch (e) {
          console.warn("Error during broadcast write, removing connection", e);
          this.removeConnection(conn.userId, conn.connectionId);
        }
      }
    });
  }

  // exposes for UI / inspection: snapshot of current connections
  listConnections(): ConnectionSnapshot {
    const snapshot: ConnectionSnapshot = {};
    this.connections.forEach((connMap, userId) => {
      snapshot[userId] = Array.from(connMap.keys());
    });
    return snapshot;
  }

  private write(conn: SSEConnection, name: string, data: any) {
  const serialized = JSON.stringify(data);
  conn.res.write(`event: ${name}\n`);
  conn.res.write(`data: ${serialized}\n\n`);
  conn.lastSeen = Date.now();
}

  private sendComment(conn: SSEConnection, comment: string) {
    conn.res.write(`: ${comment}\n\n`);
    conn.lastSeen = Date.now();
  }
}

export const sseManager = new SSEManager();

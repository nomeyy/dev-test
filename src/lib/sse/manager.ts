import { observable } from "@trpc/server/observable";
import { createServiceContext } from "@/utils/service-utils";

const { log } = createServiceContext("SSEManager");

/**
 * Represents a single SSE event with a name and data payload.
 */
export interface SSEEvent {
  event: string;
  data: unknown;
}

/**
 * Function signature for sending an SSE event to a client.
 */
export type SSESendFn = (event: string, data: unknown) => void;

/**
 * Represents a connected SSE client.
 */
export interface SSEClient {
  id: string;
  send: SSESendFn;
}

/**
 * Basic in-memory SSE manager used to broadcast events to connected clients.
 * Handles client registration, event broadcasting, and heartbeats.
 */
type EventName = "connect" | "disconnect";
type Listener = (clientId: string) => void;

class SSEManager {
  // Map of client IDs to SSEClient objects
  private clients = new Map<string, SSEClient>();
  // Heartbeat timer ID
  private heartbeatId: NodeJS.Timeout | null = null;
  // Event listeners for connect/disconnect
  private listeners: Record<EventName, Set<Listener>> = {
    connect: new Set(),
    disconnect: new Set(),
  };

  /**
   * @param heartbeatIntervalMs Interval for sending heartbeat pings (ms)
   */
  constructor(private heartbeatIntervalMs = 30000) {}

  /**
   * Returns the number of currently connected clients.
   */
  getClientCount() {
    return this.clients.size;
  }

  /**
   * Returns an array of all connected client IDs.
   */
  getClientIds() {
    return Array.from(this.clients.keys());
  }

  /**
   * Starts sending heartbeat pings to all clients at the configured interval.
   */
  startHeartbeat() {
    this.heartbeatId ??= setInterval(() => {
      for (const client of this.clients.values()) {
        try {
          client.send("ping", { ts: Date.now() });
        } catch (err) {
          log.error("heartbeat failed", err, { clientId: client.id });
        }
      }
    }, this.heartbeatIntervalMs);
  }

  /**
   * Stops the heartbeat timer if running.
   */
  stopHeartbeat() {
    if (this.heartbeatId) {
      clearInterval(this.heartbeatId);
      this.heartbeatId = null;
    }
  }

  /**
   * Calls all listeners for a given event type.
   */
  private emit(event: EventName, clientId: string) {
    for (const cb of this.listeners[event]) {
      try {
        cb(clientId);
      } catch (err) {
        log.error("listener error", err, { event, clientId });
      }
    }
  }

  /**
   * Registers a listener for connect or disconnect events.
   * Returns an unsubscribe function.
   */
  on(event: EventName, listener: Listener) {
    this.listeners[event].add(listener);
    return () => this.listeners[event].delete(listener);
  }

  /**
   * Adds a new client to the manager and starts heartbeat if first client.
   */
  addClient(client: SSEClient) {
    this.clients.set(client.id, client);
    log.info("client connected", { clientId: client.id });
    if (this.clients.size === 1) {
      this.startHeartbeat();
    }
    this.emit("connect", client.id);
  }

  /**
   * Removes a client by ID and stops heartbeat if no clients remain.
   */
  removeClient(clientId: string) {
    this.clients.delete(clientId);
    log.info("client disconnected", { clientId });
    if (this.clients.size === 0) {
      this.stopHeartbeat();
    }
    this.emit("disconnect", clientId);
  }

  /**
   * Returns an observable for a client subscription, handling connect/disconnect.
   */
  subscribe(clientId: string) {
    return observable<SSEEvent>((emit) => {
      // Create a send function for this client
      const send: SSESendFn = (event, data) => emit.next({ event, data });
      const client: SSEClient = { id: clientId, send };
      this.addClient(client);
      log.debug("subscribe", { clientId });
      // Notify client of successful connection
      send("connected", { id: clientId });

      // Cleanup on unsubscribe
      return () => {
        this.removeClient(clientId);
        log.debug("unsubscribe", { clientId });
      };
    });
  }

  /**
   * Sends an event to a specific client by ID.
   */
  send(clientId: string, event: string, data: unknown) {
    const client = this.clients.get(clientId);
    if (!client) return;
    try {
      client.send(event, data);
    } catch (err) {
      log.error("send failed", err, { clientId, event });
    }
  }

  /**
   * Sends an event to multiple clients by their IDs.
   */
  sendMany(clientIds: string[], event: string, data: unknown) {
    for (const id of clientIds) {
      this.send(id, event, data);
    }
  }

  /**
   * Broadcasts an event to all connected clients.
   */
  broadcast(event: string, data: unknown) {
    log.info("broadcast", { event, clientCount: this.clients.size });
    for (const client of this.clients.values()) {
      try {
        client.send(event, data);
      } catch (err) {
        log.error("broadcast failed", err, { clientId: client.id, event });
      }
    }
  }
}

/**
 * Singleton instance of the SSEManager for use throughout the app.
 */
export const sseManager = new SSEManager();

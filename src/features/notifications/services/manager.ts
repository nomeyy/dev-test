import { observable } from "@trpc/server/observable";
import { createServiceContext } from "@/utils/service-utils";
import { 
  type SSEEvent, 
  type SSEClient, 
  type SSESendFn,
  NotificationType,
  type NotificationEvent 
} from "../types";

const { log } = createServiceContext("NotificationManager");

type EventName = "connect" | "disconnect";
type Listener = (clientId: string) => void;

/**
 * Enhanced notification manager combining SSE management with structured notifications.
 * Handles client registration, event broadcasting, heartbeats, and lifecycle management.
 */
export class NotificationManager {
  // Map of client IDs to SSEClient objects
  private clients = new Map<string, SSEClient>();
  // Heartbeat timer ID
  private heartbeatId: NodeJS.Timeout | null = null;
  // Event listeners for connect/disconnect
  private listeners: Record<EventName, Set<Listener>> = {
    connect: new Set(),
    disconnect: new Set(),
  };

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
      const heartbeatEvent: NotificationEvent = {
        type: NotificationType.Heartbeat,
        ts: Date.now(),
        timestamp: Date.now(),
      };
      
      for (const client of this.clients.values()) {
        try {
          client.send("heartbeat", heartbeatEvent);
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
    
    // Emit new subscriber notification to all clients
    const newSubEvent: NotificationEvent = {
      type: NotificationType.NewSub,
      subId: client.id,
      timestamp: Date.now(),
    };
    this.broadcastEvent("newSub", newSubEvent);
    
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
    
    // Emit unsubscribe notification to remaining clients
    const unsubEvent: NotificationEvent = {
      type: NotificationType.Unsub,
      subId: clientId,
      timestamp: Date.now(),
    };
    this.broadcastEvent("unsub", unsubEvent);
    
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
      const connectedEvent: NotificationEvent = {
        type: NotificationType.Connected,
        id: clientId,
        timestamp: Date.now(),
      };
      send("connected", connectedEvent);

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
  send(clientId: string, event: string, data: NotificationEvent) {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    try {
      // Add timestamp if not present
      const eventData = { ...data, timestamp: data.timestamp ?? Date.now() };
      client.send(event, eventData);
    } catch (err) {
      log.error("send failed", err, { clientId, event });
    }
  }

  /**
   * Sends an event to multiple clients by their IDs.
   */
  sendMany(clientIds: string[], event: string, data: NotificationEvent) {
    for (const id of clientIds) {
      this.send(id, event, data);
    }
  }

  /**
   * Broadcasts an event to all connected clients.
   */
  broadcast(event: string, data: NotificationEvent) {
    log.info("broadcast", { event, clientCount: this.clients.size });
    
    const eventData = { ...data, timestamp: data.timestamp ?? Date.now() };
    
    for (const client of this.clients.values()) {
      try {
        client.send(event, eventData);
      } catch (err) {
        log.error("broadcast failed", err, { clientId: client.id, event });
      }
    }
  }

  /**
   * Internal method to broadcast events (used for lifecycle events)
   */
  private broadcastEvent(event: string, data: NotificationEvent) {
    for (const client of this.clients.values()) {
      try {
        client.send(event, data);
      } catch (err) {
        log.error("broadcast event failed", err, { clientId: client.id, event });
      }
    }
  }

  /**
   * Send a ping notification with optional message and targeting
   */
  notify(subIds: string[], message?: string) {
    const pingEvent: NotificationEvent = {
      type: NotificationType.Ping,
      message,
      timestamp: Date.now(),
    };

    if (subIds.length === 0) {
      this.broadcast("ping", pingEvent);
    } else {
      this.sendMany(subIds, "ping", pingEvent);
    }
  }
}

/**
 * Singleton instance of the NotificationManager for use throughout the app.
 */
export const notificationManager = new NotificationManager();
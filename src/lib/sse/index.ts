import type { Client, User } from "./types";

export class SSEManager {
  private static instance: SSEManager;

  // Stores connected clients in memory: Map<userId, Client>
  private clients = new Map<string, Client>();

  // Heartbeat timer reference (null if stopped)
  private heartbeatInterval: NodeJS.Timeout | null = null;

  // How often heartbeat events are sent to keep connections alive
  private readonly HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds

  /**
   * Returns the single instance of SSEManager (Singleton pattern)
   */
  static getInstance(): SSEManager {
    if (!SSEManager.instance) {
      SSEManager.instance = new SSEManager();
    }
    return SSEManager.instance;
  }

  // Private constructor ensures no external instantiation
  private constructor() {
    this.startHeartbeat();
  }

  /**
   * Starts the heartbeat ping loop (only one allowed at a time)
   * Sends a `ping` message to all clients every HEARTBEAT_INTERVAL_MS
   */
  private startHeartbeat() {
    if (this.heartbeatInterval) return; // Already running

    this.heartbeatInterval = setInterval(() => {
      this.broadcast({
        type: "ping",
        message: `Heartbeat at ${new Date().toISOString()}`,
      });
    }, this.HEARTBEAT_INTERVAL_MS);
  }

  /**
   * Stops the heartbeat loop (used when no clients are connected)
   */
  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Adds a new SSE client to the list
   * @param controller The stream controller used to send SSE events
   * @param user The authenticated user's info
   */
  addClient(controller: ReadableStreamDefaultController, user: User) {
    // Store the client in memory keyed by user ID
    this.clients.set(user.id, { controller, ...user });

    // Notify all clients about the new connection
    this.broadcast({
      type: "connect",
      message: `${user?.name} connected`,
      clientId: user?.id,
    });

    // Update connection count for all clients
    this.broadcastCount();
  }

  /**
   * Removes a client from the list (on disconnect)
   * @param id The user ID of the disconnecting client
   */
  removeClient(id: string) {
    const client = this.clients.get(id);

    // Remove from memory
    this.clients.delete(id);

    // Notify others about the disconnection
    this.broadcast({
      type: "disconnect",
      message: `${client?.name} disconnected`,
      clientId: id,
    });

    // Update connection count for all clients
    this.broadcastCount();

    // If no clients remain, stop heartbeat
    if (this.clients.size === 0) {
      this.stopHeartbeat();
    }
  }

  /**
   * Sends an event to a specific client
   * @param clientId The target user's ID
   * @param message The message object to send (will be JSON stringified)
   */
  sendEvent<T>(clientId: string, message: T) {
    const encoder = new TextEncoder();
    const payload = `data: ${JSON.stringify(message)}\n\n`;
    const client = this.clients.get(clientId);

    if (client) {
      try {
        client.controller.enqueue(encoder.encode(payload));
      } catch (error) {
        console.error(`Error sending to client ${clientId}:`, error);
        this.removeClient(clientId); // Remove dead connection
      }
    }
  }

  /**
   * Sends an event to all connected clients
   * @param message The message object to send (will be JSON stringified)
   */
  broadcast<T>(message: T) {
    const encoder = new TextEncoder();
    const payload = `data: ${JSON.stringify(message)}\n\n`;

    for (const client of this.clients.values()) {
      try {
        client.controller.enqueue(encoder.encode(payload));
      } catch (error) {
        console.error(`Error broadcasting to client ${client.id}:`, error);
        this.removeClient(client.id); // Remove dead connection
      }
    }

    // If clients exist but heartbeat isn't running, restart it
    if (this.clients.size > 0 && !this.heartbeatInterval) {
      this.startHeartbeat();
    }
  }

  /**
   * Sends the current list of connected clients (for UI updates)
   */
  private broadcastCount() {
    const clients = Array.from(this.clients.values()).map(
      ({ image, id, name }) => ({ id, image, name }), // Only public-facing data
    );
    this.broadcast({ type: "connections", clients });
  }
}

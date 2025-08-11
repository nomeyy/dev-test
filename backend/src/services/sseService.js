const { v4: uuidv4 } = require("uuid");

class SSEService {
  constructor() {
    this.clients = new Map();
    // Heartbeat interval (30 seconds)
    this.heartbeatInterval = 30000;

    this.startHeartbeat();

    console.log("SSE Service initialized");
  }

  /**
   * Add a new client connection
   * @param {Object} res - Express response object
   * @param {string} userId - User identifier (optional)
   * @param {string} sessionId - Session identifier (optional)
   * @returns {string} clientId - Unique client identifier
   */
  addClient(res, userId = null, sessionId = null) {
    const clientId = uuidv4();

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    });

    // Store client information
    const clientInfo = {
      id: clientId,
      response: res,
      userId: userId,
      sessionId: sessionId,
      connectedAt: new Date(),
      lastPing: new Date(),
    };

    this.clients.set(clientId, clientInfo);

    this.sendToClient(clientId, "connected", {
      clientId: clientId,
      message: "SSE connection established",
      timestamp: new Date().toISOString(),
    });

    // Handle client disconnect
    res.on("close", () => {
      this.removeClient(clientId);
    });

    res.on("error", (error) => {
      console.error(`SSE connection error for client ${clientId}:`, error);
      this.removeClient(clientId);
    });

    console.log(`Client connected: ${clientId} (Total: ${this.clients.size})`);
    return clientId;
  }

  /**
   * Remove a client connection
   * @param {string} clientId - Client identifier
   */
  removeClient(clientId) {
    const client = this.clients.get(clientId);
    if (client) {
      try {
        client.response.end();
      } catch (error) {
        console.error(
          `Error closing connection for client ${clientId}:`,
          error,
        );
      }

      this.clients.delete(clientId);
      console.log(
        `Client disconnected: ${clientId} (Total: ${this.clients.size})`,
      );
    }
  }

  /**
   * Send event to a specific client
   * @param {string} clientId - Client identifier
   * @param {string} eventType - Type of event
   * @param {Object} data - Event payload
   */
  sendToClient(clientId, eventType, data) {
    const client = this.clients.get(clientId);
    if (!client) {
      console.warn(`Client ${clientId} not found`);
      return false;
    }

    try {
      const eventData = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        type: eventType,
        data: data,
      };

      const message = `event: ${eventType}\ndata: ${JSON.stringify(eventData)}\n\n`;
      client.response.write(message);

      console.log(`Event sent to client ${clientId}:`, eventType);
      return true;
    } catch (error) {
      console.error(`Error sending event to client ${clientId}:`, error);
      this.removeClient(clientId);
      return false;
    }
  }

  /**
   * Send event to multiple clients by user ID
   * @param {string} userId - User identifier
   * @param {string} eventType - Type of event
   * @param {Object} data - Event payload
   */
  sendToUser(userId, eventType, data) {
    const userClients = Array.from(this.clients.values()).filter(
      (client) => client.userId === userId,
    );

    let successCount = 0;
    userClients.forEach((client) => {
      if (this.sendToClient(client.id, eventType, data)) {
        successCount++;
      }
    });

    console.log(
      `Event sent to ${successCount}/${userClients.length} clients for user ${userId}`,
    );
    return successCount;
  }

  /**
   * Broadcast event to all connected clients
   * @param {string} eventType - Type of event
   * @param {Object} data - Event payload
   */
  broadcast(eventType, data) {
    let successCount = 0;

    this.clients.forEach((client, clientId) => {
      if (this.sendToClient(clientId, eventType, data)) {
        successCount++;
      }
    });

    console.log(
      `Broadcast sent to ${successCount}/${this.clients.size} clients`,
    );
    return successCount;
  }

  /**
   * Send heartbeat/ping to all clients
   */
  sendHeartbeat() {
    this.broadcast("ping", {
      message: "heartbeat",
      serverTime: new Date().toISOString(),
      activeClients: this.clients.size,
    });

    this.clients.forEach((client) => {
      client.lastPing = new Date();
    });
  }

  /*
         Start heartbeat mechanism
         */
  startHeartbeat() {
    setInterval(() => {
      if (this.clients.size > 0) {
        this.sendHeartbeat();
      }
    }, this.heartbeatInterval);

    console.log(`Heartbeat started (interval: ${this.heartbeatInterval}ms)`);
  }

  /*
         Get connection statistics
         */
  getStats() {
    const now = new Date();
    const clientStats = Array.from(this.clients.values()).map((client) => ({
      id: client.id,
      userId: client.userId,
      sessionId: client.sessionId,
      connectedAt: client.connectedAt,
      connectedFor: now - client.connectedAt,
      lastPing: client.lastPing,
    }));

    return {
      totalClients: this.clients.size,
      clients: clientStats,
      heartbeatInterval: this.heartbeatInterval,
    };
  }

  /**
   * Clean up stale connections
   * @param {number} maxAge - Maximum age in milliseconds (default: 5 minutes)
   */
  cleanupStaleConnections(maxAge = 5 * 60 * 1000) {
    const now = new Date();
    const staleClients = [];

    this.clients.forEach((client, clientId) => {
      const timeSinceLastPing = now - client.lastPing;
      if (timeSinceLastPing > maxAge) {
        staleClients.push(clientId);
      }
    });

    staleClients.forEach((clientId) => {
      console.log(`Removing stale client: ${clientId}`);
      this.removeClient(clientId);
    });

    return staleClients.length;
  }
}

const sseService = new SSEService();

module.exports = sseService;

// lib/sse.ts
/**
 * Centralized SSE Manager for Next.js App Router
 *
 * Provides a reusable, abstracted Server-Sent Events layer for real-time notifications.
 * Manages client connections, event dispatching, and provides clean APIs for backend integration.
 *
 * Features:
 * - Track active client connections per user/session
 * - Send named events with JSON payloads to specific clients or broadcast
 * - Handle client connection lifecycle (connect, disconnect, errors)
 * - Heartbeat mechanism to keep connections alive
 * - Proper cleanup to avoid resource leaks
 * - Error handling and logging
 *
 * Usage for Backend Integration:
 * ```typescript
 * import { sendEvent, broadcast, totalConnections } from '@/lib/sse';
 *
 * // Send to specific client
 * sendEvent('user-123', 'notification', { message: 'Hello!' });
 *
 * // Broadcast to all clients
 * broadcast('system-alert', { level: 'warning', message: 'Maintenance in 5 minutes' });
 *
 * // Get connection metrics
 * const activeConnections = totalConnections();
 * ```
 *
 * Notes:
 * - In-memory only. Use Redis pub/sub for multi-instance support in production.
 * - Heartbeat interval: 25 seconds
 * - Automatic cleanup of dead connections
 */

import { logger } from "@/utils/logging";

type Client = {
  id: string;
  name?: string;
  controller: ReadableStreamDefaultController<Uint8Array>;
  lastSeen: number;
  connectedAt: number;
};

type ConnectionMetrics = {
  totalConnections: number;
  totalClients: number;
  averageConnectionsPerClient: number;
};

// Ensure the clients map persists across hot reloads in development
declare global {
  var sseClients: Map<string, Set<Client>> | undefined;
}

const clients =
  global.sseClients ?? (global.sseClients = new Map<string, Set<Client>>());
const encoder = new TextEncoder();
const HEARTBEAT_INTERVAL = 25_000; // 25s

// Heartbeat: keep connections alive, cleanup dead connections
let heartbeatTimer: NodeJS.Timeout | null = null;

function ensureHeartbeat() {
  if (heartbeatTimer) return;

  heartbeatTimer = setInterval(() => {
    const now = Date.now();
    let deadConnections = 0;

    for (const [clientId, set] of clients) {
      for (const c of Array.from(set)) {
        try {
          // Send heartbeat
          const msg = `event: __heartbeat\ndata: ${JSON.stringify({ ts: now })}\n\n`;
          c.controller.enqueue(encoder.encode(msg));
          c.lastSeen = now;
        } catch {
          // Remove failing client
          deadConnections++;
          removeClient(clientId, c.controller);
        }
      }
    }

    if (deadConnections > 0) {
      logger.info("SSE", "heartbeat cleanup", {
        deadConnections,
        activeConnections: totalConnections(),
      });
    }
  }, HEARTBEAT_INTERVAL);
}

function addClient(
  clientId: string,
  controller: ReadableStreamDefaultController<Uint8Array>,
  name?: string,
) {
  ensureHeartbeat();
  const now = Date.now();
  const c: Client = {
    id: clientId,
    name,
    controller,
    lastSeen: now,
    connectedAt: now,
  };

  if (!clients.has(clientId)) clients.set(clientId, new Set());
  clients.get(clientId)!.add(c);

  logger.info("SSE", "client connected", {
    clientId,
    name,
    totalConnections: totalConnections(),
    totalClients: clients.size,
  });

  return c;
}

function removeClient(
  clientId: string,
  controller?: ReadableStreamDefaultController<Uint8Array>,
) {
  const set = clients.get(clientId);
  if (!set) return;

  if (!controller) {
    // Remove all connections for this client
    const connectionCount = set.size;
    set.forEach((c) => {
      try {
        c.controller.close();
      } catch {}
    });
    clients.delete(clientId);
    logger.info("SSE", "client disconnected (all connections)", {
      clientId,
      connectionCount,
    });
    return;
  }

  // Remove specific connection
  for (const c of Array.from(set)) {
    if (c.controller === controller) {
      set.delete(c);
      try {
        c.controller.close();
      } catch {}
      break;
    }
  }

  if (set.size === 0) {
    clients.delete(clientId);
    logger.info("SSE", "client disconnected (last connection)", { clientId });
  }
}

/**
 * Create an SSE ReadableStream for the route handler to return.
 * Returns { stream, close } (close removes client).
 *
 * @param clientId - Unique identifier for the client
 * @param name - Optional client name for display purposes
 * @returns Object with stream and close function
 */
export function createSSEStream(clientId: string, name?: string) {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Add client and track connection
      addClient(clientId, controller, name);

      // Send initial connection confirmation
      controller.enqueue(encoder.encode(`:ok\n\n`));

      // Send connected event
      const init = `event: __connected\ndata: ${JSON.stringify({
        message: "connected",
        ts: Date.now(),
        clientId,
        name,
      })}\n\n`;
      controller.enqueue(encoder.encode(init));
    },
    cancel() {
      // Cleanup when client disconnects
      removeClient(clientId);
    },
  });

  // Helper to remove just this controller (for errors)
  const close = (controller?: ReadableStreamDefaultController<Uint8Array>) => {
    removeClient(clientId, controller);
  };

  return { stream, close };
}

/**
 * Send named event to all connections for a given clientId
 *
 * @param clientId - Target client identifier
 * @param eventName - Name of the event to send
 * @param payload - JSON payload to send with the event
 * @returns true if event was sent successfully, false if no connections found
 */
export function sendEvent(
  clientId: string,
  eventName: string,
  payload: unknown,
): boolean {
  const set = clients.get(clientId);
  if (!set || set.size === 0) {
    logger.warn(
      "SSE",
      `sendEvent failed - no connections for client ${clientId}, event ${eventName}`,
    );
    return false;
  }

  const data = JSON.stringify(payload);
  const chunk = `event: ${eventName}\ndata: ${data}\n\n`;
  let sentCount = 0;

  for (const c of set) {
    try {
      c.controller.enqueue(encoder.encode(chunk));
      c.lastSeen = Date.now();
      sentCount++;
    } catch {
      // Remove failing connection
      removeClient(clientId, c.controller);
    }
  }

  logger.info(
    "SSE",
    `event sent to client ${clientId}, event ${eventName}, sent ${sentCount}/${set.size} connections`,
  );
  return sentCount > 0;
}

/**
 * Broadcast event to all connected clients
 *
 * @param eventName - Name of the event to broadcast
 * @param payload - JSON payload to send with the event
 * @returns Number of clients that received the broadcast
 */
export function broadcast(eventName: string, payload: unknown): number {
  const data = JSON.stringify(payload);
  const chunk = `event: ${eventName}\ndata: ${data}\n\n`;
  let totalSent = 0;
  let totalClients = 0;

  for (const [clientId, set] of clients) {
    let clientSent = 0;
    totalClients++;

    for (const c of Array.from(set)) {
      try {
        c.controller.enqueue(encoder.encode(chunk));
        c.lastSeen = Date.now();
        clientSent++;
      } catch {
        removeClient(clientId, c.controller);
      }
    }

    if (clientSent > 0) {
      totalSent += clientSent;
    }
  }

  logger.info(
    "SSE",
    `broadcast sent: event ${eventName}, sent ${totalSent} to ${totalClients} clients, total connections: ${totalConnections()}`,
  );

  return totalSent;
}

/**
 * Get total number of active connections across all clients
 *
 * @returns Total number of active SSE connections
 */
export function totalConnections(): number {
  let total = 0;
  for (const set of clients.values()) total += set.size;
  return total;
}

/**
 * Get detailed connection metrics
 *
 * @returns Object with connection statistics
 */
export function getConnectionMetrics(): ConnectionMetrics {
  let totalConnections = 0;
  const totalClients = clients.size;

  for (const set of clients.values()) {
    totalConnections += set.size;
  }

  const averageConnectionsPerClient =
    totalClients > 0 ? totalConnections / totalClients : 0;

  return {
    totalConnections,
    totalClients,
    averageConnectionsPerClient:
      Math.round(averageConnectionsPerClient * 100) / 100,
  };
}

/**
 * Get list of connected client IDs
 *
 * @returns Array of client IDs that have active connections
 */
export function getConnectedClients(): string[] {
  return Array.from(clients.keys());
}

/**
 * Check if a specific client has active connections
 *
 * @param clientId - Client identifier to check
 * @returns true if client has active connections
 */
export function hasClientConnections(clientId: string): boolean {
  const set = clients.get(clientId);
  return set ? set.size > 0 : false;
}

/**
 * Generate a unique client ID
 *
 * @returns Unique client identifier
 */
export function generateClientId(): string {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get detailed information about all connected clients
 *
 * @returns Array of client information objects
 */
export function getClientDetails(): Array<{
  id: string;
  name?: string;
  connectionCount: number;
  connectedAt: number;
  lastSeen: number;
}> {
  const details: Array<{
    id: string;
    name?: string;
    connectionCount: number;
    connectedAt: number;
    lastSeen: number;
  }> = [];

  for (const [clientId, clientSet] of clients) {
    if (clientSet.size > 0) {
      // Get the first client's metadata (all connections for same client should have same name/connectedAt)
      const firstClient = Array.from(clientSet)[0];
      if (firstClient) {
        details.push({
          id: clientId,
          name: firstClient.name,
          connectionCount: clientSet.size,
          connectedAt: firstClient.connectedAt,
          lastSeen: Math.max(...Array.from(clientSet).map((c) => c.lastSeen)),
        });
      }
    }
  }

  return details.sort((a, b) => b.connectedAt - a.connectedAt); // Most recent first
}

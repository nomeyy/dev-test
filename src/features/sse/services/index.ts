import type { SSEClient, SSEEvent } from "@/types/sse";
import { v4 as uuidv4 } from "uuid";

// Module-level state (equivalent to private class properties)
const clients = new Map<string, SSEClient>();
const adminControllers = new Set<ReadableStreamDefaultController>();
let heartbeatInterval: NodeJS.Timeout | null = null;

// Helper functions
const formatEvent = (event: SSEEvent): Uint8Array => {
  return new TextEncoder().encode(
    `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`,
  );
};

const broadcastClients = () => {
  const clientIds = Array.from(clients.keys());
  broadcast({ event: "clients", data: { clients: clientIds } });
};

const ensureHeartbeat = () => {
  heartbeatInterval ??= setInterval(() => {
    broadcast({ event: "ping", data: {} });
  }, 3000);
};

// Main functions
export const addClient = (
  controller: ReadableStreamDefaultController,
  userId?: string,
): string => {
  const id = uuidv4();
  clients.set(id, { id, controller, userId });
  controller.enqueue(formatEvent({ event: "connected", data: { id } }));
  broadcastClients();
  broadcast({ event: "client-connect", data: { id } });
  ensureHeartbeat();
  return id;
};

export const addAdmin = (controller: ReadableStreamDefaultController) => {
  adminControllers.add(controller);
  controller.enqueue(
    formatEvent({
      event: "clients",
      data: { clients: getActiveClients() },
    }),
  );
};

export const removeClient = (id: string) => {
  const client = clients.get(id);
  if (client) {
    clients.delete(id);
    try {
      client.controller.close();
    } catch {}
    broadcastClients();
    broadcast({ event: "client-disconnect", data: { id } });
  }
  if (clients.size === 0 && heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
};

export const removeAdmin = (controller: ReadableStreamDefaultController) => {
  adminControllers.delete(controller);
  controller.close();
};

export const sendToClient = (id: string, event: SSEEvent): boolean => {
  const client = clients.get(id);
  if (client) {
    client.controller.enqueue(formatEvent(event));
    return true;
  }
  return false;
};

export const broadcast = (event: SSEEvent, excludeId?: string): number => {
  let count = 0;
  // If event is a broadcast with clientId, send to that client and all admins
  if (event.event === "broadcast" && event.data.clientId) {
    const clientId = event.data.clientId;
    if (typeof clientId === "string") {
      // Send to the specific client
      sendToClient(clientId, event);
    }
    // Also send to all admins
    for (const admin of adminControllers) {
      admin.enqueue(formatEvent(event));
    }
    return 1;
  }
  // Otherwise, send to all clients and all admins
  for (const [id, client] of clients.entries()) {
    if (excludeId && id === excludeId) continue;
    client.controller.enqueue(formatEvent(event));
    count++;
  }
  for (const admin of adminControllers) {
    admin.enqueue(formatEvent(event));
  }
  return count;
};

export const getActiveClients = (): string[] => {
  return Array.from(clients.keys());
};

// Export a service object for backward compatibility
export const sseService = {
  addClient,
  addAdmin,
  removeClient,
  removeAdmin,
  sendToClient,
  broadcast,
  getActiveClients,
};

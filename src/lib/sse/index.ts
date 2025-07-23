/**
 * SSE Lib
 *
 * Usage:
 *
 * // Send a named event to a specific client channel (e.g., user or session)
 * sendEvent("user-123", "job-update", { status: "done" });
 *
 * // Broadcast a named event to all connected clients
 * broadcast("system-notify", { message: "🚨 System-wide message" });
 *
 * Event name can be anything (e.g., "job-update", "chat", "order-done").
 * Payload must be JSON-serializable.
 *
 * These helpers are designed for use inside:
 * - TRPC procedures
 * - webhooks
 * - background jobs
 */

type Client = {
  write: (data: string) => void;
};

const clients: Record<string, Set<Client>> = {};

export const registerClient = (channel: string, client: Client) => {
  clients[channel] ??= new Set();
  clients[channel].add(client);
  console.log(
    `[SSE] Client connected to ${channel}. Total: ${clients[channel].size}`,
  );
};

export const unregisterClient = (channel: string, client: Client) => {
  clients[channel]?.delete(client);
  if (clients[channel]?.size === 0) delete clients[channel];
  console.log(`[SSE] Client disconnected from ${channel}`);
};

export const sendEvent = (channel: string, event: string, data: unknown) => {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients[channel]?.forEach((client) => {
    try {
      client.write(payload);
    } catch (err) {
      console.error(`[SSE] Failed to send to ${channel}`, err);
      unregisterClient(channel, client);
    }
  });
};

export const broadcast = (event: string, data: unknown) => {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  Object.entries(clients).forEach(([channel, connections]) => {
    connections.forEach((client) => {
      try {
        client.write(payload);
      } catch (err) {
        console.error(`[SSE] Failed to broadcast to ${channel}`, err);
        unregisterClient(channel, client);
      }
    });
  });
};

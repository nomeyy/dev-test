import type { SSEWriter, TSSEClient } from "@/types/sse";
import { v4 as uuidv4 } from "uuid";

// Module-level state (equivalent to private class properties)
const clients = new Map<string, TSSEClient>();

// Main functions
export const addClient = (writer: SSEWriter, userId?: string): string => {
  const id = uuidv4();
  const client: TSSEClient = { id, writer, userId };
  clients.set(id, client);
  return id;
};

export const removeClient = (id: string) => {
  clients.delete(id);
};

export const sendEventToClient = async (
  id: string,
  event: string,
  data: unknown,
) => {
  const client = clients.get(id);
  if (client) {
    await client.writer.write(
      `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
    );
  }
};

export const broadcastEvent = async (event: string, data: unknown) => {
  for (const client of clients.values()) {
    await client.writer.write(
      `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
    );
  }
};

export const sendEventToUser = async (
  userId: string,
  event: string,
  data: unknown,
) => {
  for (const client of clients.values()) {
    if (client.userId === userId) {
      await client.writer.write(
        `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
      );
    }
  }
};

export const heartbeat = async () => {
  for (const client of clients.values()) {
    await client.writer.write(`event: ping\ndata: {}\n\n`);
  }
};

export const getClientCount = () => {
  return clients.size;
};

// Export a manager object for backward compatibility
export const sseManager = {
  addClient,
  removeClient,
  sendEventToClient,
  broadcastEvent,
  sendEventToUser,
  heartbeat,
  getClientCount,
};

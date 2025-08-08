// lib/sseManager.ts
export type SSEClient = {
  send: (event: string, data: Record<string, any>) => void;
  close: () => void;
  username: string;
};

const clients = new Map<string, SSEClient>();

export function addClient(clientId: string, client: SSEClient) {
  clients.set(clientId, client);
  client.send("connected", { message: `${clientId} Connected to SSE` });
  broadcastClientList();
}

export function removeClient(clientId: string) {
  const client = clients.get(clientId);
  if (client) {
    clients.delete(clientId);
    broadcastClientList();
  }
}

export function sendToClient(
  clientId: string,
  event: string,
  data: Record<string, any>,
) {
  const client = clients.get(clientId);
  if (client) {
    client.send(event, data);
    return true;
  }
  return false;
}

export function broadcast(
  loginUser: string | null,
  event: string,
  data: Record<string, any>,
) {
  const clientsToRemove: string[] = [];

  for (const [id, client] of clients.entries()) {
    try {
      if (id !== loginUser) {
        client.send(event, data);
      } else {
        console.log(`${id} :: Skipping self`);
      }
    } catch (error) {
      console.log(`${id} :: Failed to send, marking for removal`);
      clientsToRemove.push(id);
    }
  }

  // Remove failed clients
  clientsToRemove.forEach((id) => {
    clients.delete(id);
  });

  if (clientsToRemove.length > 0) {
    broadcastClientList();
  }
}

function startHeartbeat(intervalMs = 5000) {
  setInterval(() => {
    const clientsToRemove: string[] = [];

    for (const [id, client] of clients.entries()) {
      try {
        client.send("ping", {});
      } catch (_) {
        console.log(`${id} :: Disconnected during heartbeat`);
        clientsToRemove.push(id);
      }
    }

    // Remove disconnected clients
    clientsToRemove.forEach((id) => {
      clients.delete(id);
    });

    if (clientsToRemove.length > 0) {
      broadcastClientList();
    }
  }, intervalMs);
}

let heartbeatStarted = false;
export function init() {
  if (!heartbeatStarted) {
    startHeartbeat();
    heartbeatStarted = true;
  }
}

export function getAllClients() {
  return Array.from(clients.entries()).map(([id, client]) => ({
    clientId: id,
    username: client.username,
  }));
}

export function broadcastClientList() {
  const clientList = getAllClients();
  broadcast(null, "update_clients", { clients: clientList });
}


type SendFunction = (message: string) => void;

const clients = new Map<string, SendFunction>();

export const addClient = (userId: string, send: SendFunction) => {
  clients.set(userId, send);
};

export const removeClient = (userId: string) => {
  clients.delete(userId);
};

export const sendEventToUser = (userId: string, event: string, data: any) => {
  const send = clients.get(userId);
  if (send) {
    send(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }
};

export const broadcastEvent = (event: string, data: any) => {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const send of clients.values()) {
    send(message);
  }
};

export const sendHeartbeat = () => {
  for (const send of clients.values()) {
    send(`event: ping\ndata: {}\n\n`);
  }
};

export const getConnectedUsers = () => {
  return [...clients.keys()];
};


const HEARTBEAT_INTERVAL = 30_000;

setInterval(() => {
  sendHeartbeat();
  console.log("💓 Heartbeat sent to:", getConnectedUsers());
}, HEARTBEAT_INTERVAL);

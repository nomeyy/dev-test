const clients = new Map();

function addClient(id, res) {
  clients.set(id, res);
  console.log(`Client ${id} connected. Total clients: ${clients.size}`);
}

function removeClient(id) {
  if (clients.has(id)) {
    clients.get(id).end();
    clients.delete(id);
    console.log(`Client ${id} disconnected. Total clients: ${clients.size}`);
  }
}

function sendEvent(id, eventName, data) {
  const res = clients.get(id);
  if (res) {
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}

function broadcast(eventName, data) {
  for (const [id, res] of clients.entries()) {
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}

function startHeartbeat(intervalMs = 20000) {
  setInterval(() => {
    for (const [id, res] of clients.entries()) {
      res.write(`event: ping\n`);
      res.write(`data: {}\n\n`);
    }
  }, intervalMs);
}

module.exports = {
  addClient,
  removeClient,
  sendEvent,
  broadcast,
  startHeartbeat,
};

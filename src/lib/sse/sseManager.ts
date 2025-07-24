type Client = {
  id: string;
  writer: WritableStreamDefaultWriter<Uint8Array>;
};

const clients = new Map<string, Client>();

export function addClient(
  id: string,
  writer: WritableStreamDefaultWriter<Uint8Array>,
) {
  clients.set(id, { id, writer });
}

export function removeClient(id: string) {
  clients.delete(id);
}

export function broadcast(event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const { writer } of clients.values()) {
    writer.write(new TextEncoder().encode(payload));
  }
}

type ClientResponse = {
    write: (data: string) => void;
    end: () => void;
};

// SSEManager handles server-sent events for multiple connected clients
class SSEManager {
    // Stores connected clients with their corresponding response object
    private clients: Map<string, ClientResponse> = new Map();

    // Adds a new client and immediately sends a "connected" event
    addClient(clientId: string, res: ClientResponse) {
        console.log("Add client : ", clientId);
        this.clients.set(clientId, res);
        this.send(clientId, 'connected', { clientId });
        console.log(`SSE client connected: ${clientId}`);
    }

    // Removes a client and closes the connection
    removeClient(clientId: string) {
        const res = this.clients.get(clientId);
        if (res) {
            res.end(); // Ends the SSE connection
            this.clients.delete(clientId); // Removes client from the map
            console.log(`SSE client disconnected: ${clientId}`);
        }
    }

    // Sends a specific event with data to the given client
    send(clientId: string, event: string, data: any) {
        const res = this.clients.get(clientId);

        if (res) {
            const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
            res.write(payload); // Sends the event to the client
        }
    }

    // Sends a message to all connected clients
    broadcast(event: string, data: any) {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

        for (const [clientId, res] of this.clients.entries()) {
            try {
                res.write(payload);
            } catch (err) {
                console.warn(`Failed to send broadcast to client ${clientId}:`, err);
            }
        }
    }

    // Periodically sends a ping message to keep the SSE connection alive
    ping(interval = 10000) {
        setInterval(() => {
            console.log(this.clients);
            for (const res of this.clients.values()) {
                res.write(`: ping...\n\n`); // Comment line in SSE, used as heartbeat
            }
        }, interval);
    }
}

// Creates a singleton instance of SSEManager and starts the ping
const sseManager = new SSEManager();
sseManager.ping(); // Start sending heartbeat pings

export default sseManager;

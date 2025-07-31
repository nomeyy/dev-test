
type ClientResponse = {
    write: (data: string) => void;
    end: () => void;
};

class SSEManager {
    private clients: Map<string, ClientResponse> = new Map();

    addClient(clientId: string, res: ClientResponse) {
        console.log("Add client : ", clientId);
        this.clients.set(clientId, res);
        this.send(clientId, 'connected', { clientId });
        console.log(`SSE client connected: ${clientId}`);
    }

    removeClient(clientId: string) {
        const res = this.clients.get(clientId);
        if (res) {
            res.end();
            this.clients.delete(clientId);
            console.log(`SSE client disconnected: ${clientId}`);
        }
    }

    // send(clientId: string, event: string, data: any) {
    //     const res = this.clients.get(clientId);

    //     if (res) {
    //         res.write(`event: ${event}\n`);
    //         res.write(`data: ${JSON.stringify(data)}\n\n`);
    //     }
    // }
    send(clientId: string, event: string, data: any) {
        const res = this.clients.get(clientId);

        if (res) {
            const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
            res.write(payload); // 👈 Single write flushes it properly
        }
    }

    ping(interval = 10000) {
        setInterval(() => {
            console.log(this.clients);
            for (const res of this.clients.values()) {
                res.write(`: ping...\n\n`);
            }
        }, interval);
    }
}

const sseManager = new SSEManager();
sseManager.ping(); // start ping immediately

export default sseManager;

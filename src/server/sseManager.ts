type SSEClient = {
    id: string
    write: (msg: string) => void
    close: () => void
}

class SSEManager {
    private clients = new Map<string, SSEClient>()
    private heartbeatInterval: NodeJS.Timeout | null = null

    private startHeartbeat() {
        if (this.heartbeatInterval) return 
        this.heartbeatInterval = setInterval(() => {
            for (const client of this.clients.values()) {
                client.write(`event: ping\ndata: {}\n\n`)
            }
        }, 3000)
        console.log("[SSEManager] Heartbeat started")
    }

    private stopHeartbeat() {
        if (this.heartbeatInterval && this.clients.size === 0) {
            clearInterval(this.heartbeatInterval)
            this.heartbeatInterval = null
            console.log("[SSEManager] Heartbeat stopped (no clients)")
        }
    }

    addClient(client: Omit<SSEClient, 'id'>, userId: string) {
        const fullClient: SSEClient = { id: userId, ...client }
        this.clients.set(userId, fullClient)
        fullClient.write(`event: connected\ndata: {"id": "${userId}"}\n\n`)
        this.startHeartbeat()
    }

    removeClient(id: string) {
        const client = this.clients.get(id)
        if (client) {
            client.close()
            this.clients.delete(id)
            this.stopHeartbeat()
        }
    }

    sendEvent(id: string, event: string, data: object) {
        console.log(`[SSEManager] sendEvent → ${event} to ${id}`, data)
        const client = this.clients.get(id)
        if (client) {
            client.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        } else {
            console.warn(`[SSEManager] No client found for ID: ${id}`)
        }
    }

    broadcast(event: string, data: object) {
        for (const client of this.clients.values()) {
            client.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        }
    }
}

export const sseManager = new SSEManager()

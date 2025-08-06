import { SSEClient, SSEEvent, SSEManagerConfig } from './types';

export class SSEManager {
    private static instance: SSEManager;
    private clients: Map<string, SSEClient> = new Map();
    private config: SSEManagerConfig;
    private heartbeatTimer?: NodeJS.Timeout;

    constructor(config?: Partial<SSEManagerConfig>) {
        console.log("ssemanager")
        this.config = {
            heartbeatInterval: 3000, // 30 seconds
            clientTimeout: 30000, // 1 minute
            maxConnections: 1000,
            ...config
        };

        this.startHeartbeat();
    }

    public static getInstance(config?: Partial<SSEManagerConfig>): SSEManager {
        if (!SSEManager.instance) {
            SSEManager.instance = new SSEManager(config);
        }
        return SSEManager.instance;
    }

    /**
     * Add a new client connection
     */
    public addClient(client: SSEClient): void {
        if (this.clients.size >= this.config.maxConnections) {
            throw new Error('Maximum number of SSE connections reached');
        }

        this.clients.set(client.id, client);
        console.log("total clients", this.clients)
        console.log(`SSE client connected: ${client.id} (Total: ${this.clients.size})`);

        // Send initial connection event
        this.sendToClient(client.id, {
            event: 'connected',
            data: { clientId: client.id, timestamp: new Date().toISOString() }
        });
    }

    /**
     * Remove a client connection
     */
    public removeClient(clientId: string): void {
        const client = this.clients.get(clientId);
        if (client) {
            try {
                client.controller.close();
            } catch (error) {
                console.error(`Error closing client ${clientId}:`, error);
            }

            this.clients.delete(clientId);
            console.log(`SSE client disconnected: ${clientId} (Total: ${this.clients.size})`);
        }
    }

    /**
     * Send event to a specific client
     */
    public sendToClient(clientId: string, event: SSEEvent): boolean {
        const client = this.clients.get(clientId);
        if (!client) {
            console.warn(`Client ${clientId} not found`);
            return false;
        }

        try {
            const message = this.formatSSEMessage(event);
            client.controller.enqueue(new TextEncoder().encode(message));
            return true;
        } catch (error) {
            console.error(`Error sending to client ${clientId}:`, error);
            this.removeClient(clientId);
            return false;
        }
    }

    /**
     * Send event to multiple clients by user ID
     */
    public sendToUser(userId: string, event: SSEEvent): number {
        let sentCount = 0;
        for (const [clientId, client] of this.clients) {
            if (client.userId === userId) {
                if (this.sendToClient(clientId, event)) {
                    sentCount++;
                }
            }
        }
        return sentCount;
    }

    /**
     * Send event to multiple clients by session ID
     */
    public sendToSession(sessionId: string, event: SSEEvent): number {
        let sentCount = 0;
        for (const [clientId, client] of this.clients) {
            if (client.sessionId === sessionId) {
                if (this.sendToClient(clientId, event)) {
                    sentCount++;
                }
            }
        }
        return sentCount;
    }

    /**
     * Broadcast event to all connected clients
     */
    public broadcast(event: SSEEvent): number {
        let sentCount = 0;
        for (const clientId of this.clients.keys()) {
            if (this.sendToClient(clientId, event)) {
                sentCount++;
            }
        }
        return sentCount;
    }

    /**
     * Send event to clients matching a filter function
     */
    public sendToMatching(
        filter: (client: SSEClient) => boolean,
        event: SSEEvent
    ): number {
        let sentCount = 0;
        for (const [clientId, client] of this.clients) {
            if (filter(client) && this.sendToClient(clientId, event)) {
                sentCount++;
            }
        }
        return sentCount;
    }

    /**
     * Get client statistics
     */
    public getStats() {
        const userConnections = new Map<string, number>();
        const sessionConnections = new Map<string, number>();

        for (const client of this.clients.values()) {
            if (client.userId) {
                userConnections.set(
                    client.userId,
                    (userConnections.get(client.userId) || 0) + 1
                );
            }
            sessionConnections.set(
                client.sessionId,
                (sessionConnections.get(client.sessionId) || 0) + 1
            );
        }

        return {
            totalConnections: this.clients.size,
            uniqueUsers: userConnections.size,
            uniqueSessions: sessionConnections.size,
            userConnections: Object.fromEntries(userConnections),
            sessionConnections: Object.fromEntries(sessionConnections)
        };
    }

    /**
     * Format SSE message according to the protocol
     */
    private formatSSEMessage(event: SSEEvent): string {
        let message = '';

        if (event.id) {
            message += `id: ${event.id}\n`;
        }

        if (event.event) {
            message += `event: ${event.event}\n`;
        }

        if (event.retry) {
            message += `retry: ${event.retry}\n`;
        }

        const data = typeof event.data === 'string'
            ? event.data
            : JSON.stringify(event.data);

        // Handle multiline data
        data.split('\n').forEach(line => {
            message += `data: ${line}\n`;
        });

        message += '\n';
        return message;
    }

    /**
     * Start heartbeat to keep connections alive
     */
    private startHeartbeat(): void {
        this.heartbeatTimer = setInterval(() => {
            const now = Date.now();
            const deadClients: string[] = [];

            // Check for dead clients and send heartbeat
            for (const [clientId, client] of this.clients) {
                if (now - client.lastPing > this.config.clientTimeout) {
                    deadClients.push(clientId);
                } else {
                    try {
                        const heartbeat = this.formatSSEMessage({
                            event: 'ping',
                            data: { timestamp: new Date().toISOString() }
                        });
                        client.controller.enqueue(new TextEncoder().encode(heartbeat));
                        client.lastPing = now;
                    } catch (error) {
                        console.error(`Error sending heartbeat to ${clientId}:`, error);
                        deadClients.push(clientId);
                    }
                }
            }

            // Clean up dead clients
            deadClients.forEach(clientId => this.removeClient(clientId));

            if (deadClients.length > 0) {
                console.log(`Cleaned up ${deadClients.length} dead SSE connections`);
            }
        }, this.config.heartbeatInterval);
    }

    /**
     * Cleanup all connections and stop heartbeat
     */
    public cleanup(): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
        }

        for (const clientId of this.clients.keys()) {
            this.removeClient(clientId);
        }

        console.log('SSE Manager cleaned up');
    }
}
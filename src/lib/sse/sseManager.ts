import { NextRequest, NextResponse } from 'next/server';

export interface SSEClient {
  id: string;
  userId?: string;
  controller: ReadableStreamDefaultController;
  lastPing: number;
}

export interface SSEEvent {
  type: string;
  data: any;
  id?: string;
}

export interface SSEManagerConfig {
  heartbeatInterval?: number;
  clientTimeout?: number;
  maxClients?: number;
  enableLogging?: boolean;
}

class SSEManager {
  private clients: Map<string, SSEClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private config: Required<SSEManagerConfig>;

  constructor(config: SSEManagerConfig = {}) {
    this.config = {
      heartbeatInterval: config.heartbeatInterval || 30000,
      clientTimeout: config.clientTimeout || 60000,
      maxClients: config.maxClients || 1000,
      enableLogging: config.enableLogging || true,
    };

    this.startHeartbeat();
  }

  /**
   * Create SSE connection for a client
   */
  createConnection(request: NextRequest): NextResponse {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId') || this.generateClientId();
    const userId = searchParams.get('userId') || undefined;

    if (this.clients.size >= this.config.maxClients) {
      return new NextResponse('Max clients reached', { status: 503 });
    }

    const stream = new ReadableStream({
      start: (controller) => {
        const client: SSEClient = {
          id: clientId,
          userId,
          controller,
          lastPing: Date.now(),
        };

        this.clients.set(clientId, client);
        this.log(`Client ${clientId} connected. Total clients: ${this.clients.size}`);

        // Send initial connection event
        this.sendToClient(clientId, {
          type: 'connection',
          data: { clientId, connected: true, timestamp: new Date().toISOString() },
        });

        // Handle client disconnect
        request.signal.addEventListener('abort', () => {
          this.removeClient(clientId);
        });
      },
      cancel: () => {
        this.removeClient(clientId);
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  /**
   * Send event to specific client
   */
  sendToClient(clientId: string, event: SSEEvent): boolean {
    const client = this.clients.get(clientId);
    if (!client) {
      this.log(`Client ${clientId} not found`);
      return false;
    }

    try {
      const message = this.formatSSEMessage(event);
      client.controller.enqueue(new TextEncoder().encode(message));
      this.log(`Sent event '${event.type}' to client ${clientId}`);
      return true;
    } catch (error) {
      this.log(`Error sending to client ${clientId}: ${error}`);
      this.removeClient(clientId);
      return false;
    }
  }

  /**
   * Send event to multiple clients by user ID
   */
  sendToUser(userId: string, event: SSEEvent): number {
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
   * Broadcast event to all connected clients
   */
  broadcast(event: SSEEvent): number {
    let sentCount = 0;
    for (const clientId of this.clients.keys()) {
      if (this.sendToClient(clientId, event)) {
        sentCount++;
      }
    }
    return sentCount;
  }

  /**
   * Remove client
   */
  private removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      try {
        client.controller.close();
      } catch (error) {
        this.log(`Error closing client ${clientId}: ${error}`);
      }
      this.clients.delete(clientId);
      this.log(`Client ${clientId} disconnected. Total clients: ${this.clients.size}`);
    }
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const pingEvent: SSEEvent = {
        type: 'ping',
        data: { timestamp: new Date().toISOString() },
      };

      for (const [clientId, client] of this.clients) {
        if (now - client.lastPing > this.config.clientTimeout) {
          this.removeClient(clientId);
        } else {
          if (this.sendToClient(clientId, pingEvent)) {
            client.lastPing = now;
          }
        }
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Format SSE message
   */
  private formatSSEMessage(event: SSEEvent): string {
    let message = '';
    
    if (event.id) {
      message += `id: ${event.id}\n`;
    }
    
    message += `event: ${event.type}\n`;
    
    const data = typeof event.data === 'string' ? event.data : JSON.stringify(event.data);
    message += `data: ${data}\n\n`;
    
    return message;
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Log message if logging is enabled
   */
  private log(message: string): void {
    if (this.config.enableLogging) {
      console.log(`[SSE Manager] ${message}`);
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    for (const clientId of this.clients.keys()) {
      this.removeClient(clientId);
    }
  }
}

export const sseManager = new SSEManager({
  heartbeatInterval: 30000,
  clientTimeout: 60000,
  maxClients: 1000,
  enableLogging: true,
});

export default SSEManager;
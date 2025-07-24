import type { SSEClient, SSEMessagePayload, SSEManagerConfig } from '../types';

export class SSEManager {
  private static _instance: SSEManager;
  private clients = new Map<string, SSEClient>();
  private heartbeatInterval: number;
  private cleanupInterval: number;
  private readonly logger: Console;

  constructor(config: SSEManagerConfig = {}) {
    this.heartbeatInterval = config.heartbeatInterval ?? 30000;
    this.cleanupInterval = config.cleanupInterval ?? 60000;
    this.logger = console;

    this.logger.info('SSE Manager initialized', {
      heartbeatInterval: this.heartbeatInterval,
      cleanupInterval: this.cleanupInterval
    });

    this.startHeartbeat();
    this.startCleanup();
  }


  static getInstance(config: SSEManagerConfig = {}): SSEManager {
    if (!SSEManager._instance) {
      SSEManager._instance = new SSEManager(config);
    }
    return SSEManager._instance;
  }



  public connectClient(payload: { writer: WritableStreamDefaultWriter<Uint8Array>, clientId: string }) {
    const client: SSEClient = {
      id: payload.clientId,
      writer: payload.writer,
      isConnected: true,
    };
    this.clients.set(payload.clientId, client);
    this.writeMessage(client, 'connected', JSON.stringify({ id: payload.clientId }));

    this.logger.info('Client connected', {
      clientId: payload.clientId,
      totalClients: this.clients.size,
      activeClients: this.getActiveClients().length
    });
  }

  public disconnectClient(clientId: string) {
    const client = this.clients.get(clientId);
    if (!client) {
      this.logger.warn('Attempted to disconnect non-existent client', { clientId });
      return;
    }

    this.clients.set(clientId, { id: client?.id, writer: client?.writer, isConnected: false } as SSEClient);

    this.logger.info('Client disconnected', {
      clientId,
      totalClients: this.clients.size,
      activeClients: this.getActiveClients().length
    });
  }

  public sendMessage(messagePayload: SSEMessagePayload) {
    const { clientId, target, message } = messagePayload;

    this.logger.debug('Sending message', {
      clientId,
      target,
      messageLength: message.length,
      activeClients: this.getActiveClients().length
    });

    switch (target) {
      case 'all':
        this.broadcastMessage(messagePayload);
        break;
      case 'user':
        this.sendMessageToUser(clientId!, message);
        break;
      default:
        this.broadcastMessage(messagePayload);
    }
  }

  public startHeartbeat() {
    this.logger.info('Starting heartbeat interval', { interval: this.heartbeatInterval });
    setInterval(() => {
      void this.sendHeartbeat();
    }, this.heartbeatInterval);
  }

  public startCleanup() {
    this.logger.info('Starting cleanup interval', { interval: this.cleanupInterval });
    setInterval(() => {
      void this.cleanupDisconnectedClients();
    }, this.cleanupInterval);
  }

  public async cleanupDisconnectedClients() {
    let cleanedCount = 0;

    for (const client of this.clients.values()) {
      if (!client.isConnected) {
        try {
          const ready = await client.writer.ready;
          if (ready) {
            await client.writer.close();
          }
          this.clients.delete(client.id);
          cleanedCount++;
        } catch (error) {
          this.logger.error('Error cleaning up client', {
            clientId: client.id,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }

    if (cleanedCount > 0) {
      this.logger.info('Cleanup completed', {
        cleanedCount,
        remainingClients: this.clients.size,
        activeClients: this.getActiveClients().length
      });
    }
  }

  public getActiveClients() {
    return Array.from(this.clients.values()).filter(client => client.isConnected);
  }

  private async sendHeartbeat() {
    const activeClients = this.getActiveClients();

    this.logger.debug('Sending heartbeat', {
      activeClients: activeClients.length,
      totalClients: this.clients.size
    });

    this.clients.forEach((client) => {
      if (client.isConnected) {
        this.writeMessage(client, 'heartbeat', JSON.stringify({ timestamp: Date.now() }));
      }
    });
  }

  private sendMessageToUser(clientId: string, message: string) {
    const client = this.clients.get(clientId);
    if (!client?.isConnected) {
      this.logger.warn('Attempted to send message to inactive client', { clientId });
      return;
    }

    const messageData = JSON.stringify({ message, timestamp: Date.now() });
    this.writeMessage(client, 'message', messageData);

    this.logger.debug('Message sent to user', {
      clientId,
      messageLength: message.length,
      messagePreview: message.substring(0, 100)
    });
  }

  private writeMessage(client: SSEClient, event: string, messageData: string) {
    try {
      void client.writer.write(new TextEncoder().encode(`event: ${event}\ndata: ${messageData}\n\n`));

      this.logger.debug('Message written successfully', {
        clientId: client.id,
        event,
        dataLength: messageData.length
      });
    } catch (error) {
      this.logger.error('Error writing message to client', {
        clientId: client.id,
        event,
        error: error instanceof Error ? error.message : String(error)
      });

      // Mark client as disconnected on write error
      this.disconnectClient(client.id);
    }
  }

  private broadcastMessage(messagePayload: SSEMessagePayload) {
    const activeClients = this.getActiveClients();

    this.logger.debug('Broadcasting message', {
      targetClients: activeClients.length,
      messageLength: messagePayload.message.length
    });

    this.clients.forEach((client) => {
      if (client.isConnected) {
        void this.sendMessageToUser(client.id, messagePayload.message);
      }
    });
  }
} 
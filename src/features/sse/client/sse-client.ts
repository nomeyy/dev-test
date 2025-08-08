import type {
  SSEClientOptions,
  SSEEventHandler,
  SSEConnectionState,
} from '../types/index';

export interface SSEClientEvents {
  onStateChange?: (state: SSEConnectionState) => void;
  onConnect?: (event: { clientId: string; connectedAt: Date }) => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onMessage?: (event: string, data: any) => void;
  onReconnecting?: (attempt: number) => void;
}

export class SSEClient {
  private eventSource: EventSource | null = null;
  private eventHandlers = new Map<string, (data: any) => void>();
  private options: Required<SSEClientOptions>;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private state: SSEConnectionState = 'disconnected';
  private events: SSEClientEvents;

  constructor(
    private readonly endpoint: string,
    options: SSEClientOptions = {},
    events: SSEClientEvents = {}
  ) {
    this.options = {
      reconnect: options.reconnect ?? true,
      reconnectDelay: options.reconnectDelay ?? 3000,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 5,
      heartbeatTimeout: options.heartbeatTimeout ?? 45000,
    };
    this.events = events;
  }

  connect(): void {
    if (this.eventSource) {
      this.disconnect();
    }

    this.setState('connecting');

    try {
      this.log(`Connecting to ${this.endpoint}`);

      this.eventSource = new EventSource(this.endpoint, { withCredentials: false });

      this.eventSource.onopen = (event) => {
        this.log('EventSource onopen triggered', event);
        this.setState('connected');
        this.reconnectAttempts = 0;
        this.startHeartbeatMonitor();
      };

      this.eventSource.onerror = (error) => {
        this.log('EventSource onerror triggered:', error);

        if (!this.eventSource) return;

        const readyState = this.eventSource.readyState;
        this.log('EventSource readyState:', readyState);

        switch (readyState) {
          case EventSource.CONNECTING:
            this.log('EventSource state: CONNECTING - retrying...');
            if (this.state === 'connecting') {
              setTimeout(() => {
                if (this.state === 'connecting' && this.eventSource?.readyState === EventSource.CONNECTING) {
                  this.log('Connection taking too long, forcing reconnect');
                  this.handleReconnect();
                }
              }, 10000);
            }
            break;

          case EventSource.OPEN:
          case EventSource.CLOSED:
            this.log(`EventSource state: ${readyState === EventSource.OPEN ? 'OPEN' : 'CLOSED'}`);
            this.setState('error');
            this.handleReconnect();
            break;
        }

        const errorMessage = `SSE connection error - ReadyState: ${readyState}`;
        this.events.onError?.(new Error(errorMessage));
      };

      this.eventSource.onmessage = (event) => {
        this.log('Received default message:', event);
        this.resetHeartbeatMonitor();

        try {
          const data = JSON.parse(event.data);
          this.events.onMessage?.(event.type || 'message', data);
        } catch (error) {
          this.log('Error parsing message data:', error);
          this.events.onMessage?.(event.type || 'message', event.data);
        }
      };

      this.setupEventHandlers();

    } catch (error) {
      this.log('Error creating EventSource:', error);
      this.setState('error');
      this.events.onError?.(error instanceof Error ? error : new Error('Connection failed'));
      this.handleReconnect();
    }
  }

  disconnect(): void {
    this.clearTimers();

    if (this.eventSource) {
      this.log('Closing EventSource connection');
      this.eventSource.close();
      this.eventSource = null;
    }

    if (this.state !== 'disconnected') {
      this.setState('disconnected');
      this.events.onDisconnect?.();
      this.log('SSE connection closed');
    }
  }

  addEventListener(event: string, handler: (data: any) => void): void {
    this.eventHandlers.set(event, handler);
    console.log(`Event listener for '${event}' added`);

    if (this.eventSource) {
      const listener = (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          handler(data);
          this.events.onMessage?.(event, data);
        } catch (error) {
          const fallback = e.data;
          this.log(`Error parsing ${event} event data:`, error);
          handler(fallback);
          this.events.onMessage?.(event, fallback);
        }
      };
      this.eventSource.addEventListener(event, listener);
    }
  }

  removeEventListener(event: string): void {
    this.eventHandlers.delete(event);
    this.log(`Event listener for '${event}' marked for removal (manual cleanup not supported)`);
  }

  getState(): SSEConnectionState {
    return this.state;
  }

  isConnected(): boolean {
    return this.state === 'connected';
  }

  getReadyState(): number | null {
    return this.eventSource?.readyState ?? null;
  }

  private handleReconnect(): void {
    this.clearTimers();

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    if (!this.options.reconnect || this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.setState('error');
      this.log(`Max reconnection attempts reached (${this.options.maxReconnectAttempts})`);
      return;
    }

    this.reconnectAttempts++;
    this.events.onReconnecting?.(this.reconnectAttempts);

    this.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.options.maxReconnectAttempts})`);

    const delay = Math.max(this.options.reconnectDelay, 1000);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private setupEventHandlers(): void {
    if (!this.eventSource) return;

    this.eventSource.addEventListener('connected', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        this.events.onConnect?.(data);
        this.log('Connection confirmed:', data);
      } catch (error) {
        this.log('Error parsing connected event:', error);
        this.events.onConnect?.({
          clientId: 'unknown',
          connectedAt: new Date(),
        });
      }
    });

    for (const [event, handler] of this.eventHandlers) {
      const listener = (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          handler(data);
          this.events.onMessage?.(event, data);
        } catch (error) {
          const fallback = e.data;
          this.log(`Error parsing ${event} event data:`, error);
          handler(fallback);
          this.events.onMessage?.(event, fallback);
        }
      };
      this.eventSource.addEventListener(event, listener);
    }
  }

  private startHeartbeatMonitor(): void {
    this.resetHeartbeatMonitor();
  }

  private resetHeartbeatMonitor(): void {
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
    }

    this.heartbeatTimer = setTimeout(() => {
      this.log('Heartbeat timeout - connection may be stale');
      this.setState('error');
      this.handleReconnect();
    }, this.options.heartbeatTimeout);
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private setState(newState: SSEConnectionState): void {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      this.events.onStateChange?.(newState);
      this.log(`State changed: ${oldState} -> ${newState}`);
    }
  }

  private log(message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    console.log(`[SSEClient ${timestamp}] ${message}`, ...args);
  }

  destroy(): void {
    this.log('Destroying SSEClient resources');
    this.disconnect();
    this.eventHandlers.clear();
  }
}

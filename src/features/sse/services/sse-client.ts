/**
 * Client-side SSE service for consuming server-sent events
 */

export interface SSEClientOptions {
  /** Base URL for the SSE endpoint */
  url: string;
  /** Auto-reconnect on connection loss */
  autoReconnect?: boolean;
  /** Reconnection delay in milliseconds */
  reconnectDelay?: number;
  /** Maximum number of reconnection attempts */
  maxReconnectAttempts?: number;
  /** Additional headers to send with the request */
  headers?: Record<string, string>;
  /** Enable debug logging */
  debug?: boolean;
}

export interface SSEEventListener {
  event: string;
  handler: (data: unknown) => void;
}

/**
 * Client-side SSE connection manager
 */
export class SSEClient {
  private eventSource: EventSource | null = null;
  private listeners = new Map<string, Set<(data: unknown) => void>>();
  private eventSourceListeners = new Set<string>(); // Track which events have EventSource listeners
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isDestroyed = false;
  private options: Required<SSEClientOptions>;

  constructor(options: SSEClientOptions) {
    this.options = {
      autoReconnect: true,
      reconnectDelay: 3000,
      maxReconnectAttempts: 5,
      headers: {},
      debug: false,
      ...options,
    };
  }

  /**
   * Connect to the SSE endpoint
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.eventSource) {
        this.log("Already connected");
        resolve();
        return;
      }

      try {
        this.eventSource = new EventSource(this.options.url);

        this.eventSource.onopen = () => {
          this.log("SSE connection opened");
          this.reconnectAttempts = 0;
          resolve();
        };

        this.eventSource.onerror = (error) => {
          this.log(
            `SSE connection error: ${error instanceof Error ? error.message : "Unknown error"}`,
          );

          if (this.eventSource?.readyState === EventSource.CLOSED) {
            this.handleDisconnection();
          }

          if (this.reconnectAttempts === 0) {
            reject(new Error("Failed to establish SSE connection"));
          }
        };

        this.eventSource.onmessage = (event) => {
          this.handleMessage("message", String(event.data));
        };

        // Set up existing listeners
        for (const [eventType] of this.listeners) {
          this.setupEventListener(eventType);
        }
      } catch (error) {
        this.log(`Error creating EventSource: ${String(error)}`);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  /**
   * Disconnect from the SSE endpoint
   */
  public disconnect(): void {
    this.log("Disconnecting SSE client");

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    // Clear EventSource listener tracking
    this.eventSourceListeners.clear();
    this.reconnectAttempts = 0;
  }

  /**
   * Add an event listener for a specific event type
   */
  public addEventListener(
    event: string,
    handler: (data: unknown) => void,
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());

      // If already connected, set up the listener immediately
      if (this.eventSource) {
        this.setupEventListener(event);
      }
    }

    this.listeners.get(event)!.add(handler);
    this.log(`Added listener for event: ${event}`);
  }

  /**
   * Remove an event listener
   */
  public removeEventListener(
    event: string,
    handler: (data: unknown) => void,
  ): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);

      if (handlers.size === 0) {
        this.listeners.delete(event);
        this.log(`Removed all listeners for event: ${event}`);
      }
    }
  }

  /**
   * Remove all listeners for an event type
   */
  public removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
      this.log(`Removed all listeners for event: ${event}`);
    } else {
      this.listeners.clear();
      this.log("Removed all event listeners");
    }
  }

  /**
   * Get connection status
   */
  public isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }

  /**
   * Get ready state of the connection
   */
  public getReadyState(): number | null {
    return this.eventSource?.readyState ?? null;
  }

  /**
   * Destroy the client and clean up resources
   */
  public destroy(): void {
    this.isDestroyed = true;
    this.disconnect();
    this.removeAllListeners();
    this.log("SSE client destroyed");
  }

  // Private methods

  private setupEventListener(eventType: string): void {
    if (!this.eventSource || this.eventSourceListeners.has(eventType)) return;

    this.eventSource.addEventListener(eventType, (event: Event) => {
      const messageEvent = event as MessageEvent;
      this.handleMessage(eventType, String(messageEvent.data));
    });

    this.eventSourceListeners.add(eventType);
    this.log(`Set up EventSource listener for: ${eventType}`);
  }

  private handleMessage(eventType: string, data: string): void {
    try {
      let parsedData: unknown;

      try {
        parsedData = JSON.parse(data);
      } catch {
        // If JSON parsing fails, use raw string
        parsedData = data;
      }

      const handlers = this.listeners.get(eventType);
      if (handlers) {
        for (const handler of handlers) {
          try {
            handler(parsedData);
          } catch (error) {
            this.log(
              `Error in event handler for ${eventType}: ${String(error)}`,
            );
          }
        }
      }

      this.log(`Received event: ${eventType}`);
    } catch (error) {
      this.log(`Error handling message: ${String(error)}`);
    }
  }

  private handleDisconnection(): void {
    if (this.isDestroyed) return;

    this.log("SSE connection lost");
    this.eventSource = null;

    if (
      this.options.autoReconnect &&
      this.reconnectAttempts < this.options.maxReconnectAttempts
    ) {
      this.reconnectAttempts++;
      this.log(
        `Attempting to reconnect (${this.reconnectAttempts}/${this.options.maxReconnectAttempts})`,
      );

      this.reconnectTimer = setTimeout(() => {
        this.connect().catch(() => {
          // Reconnection failed, will try again if under limit
        });
      }, this.options.reconnectDelay);
    } else {
      this.log("Max reconnection attempts reached or auto-reconnect disabled");
    }
  }

  private log(message: string): void {
    if (this.options.debug) {
      console.log(`[SSE Client] ${message}`);
    }
  }
}

/**
 * Factory function to create an SSE client
 */
export function createSSEClient(options: SSEClientOptions): SSEClient {
  return new SSEClient(options);
}

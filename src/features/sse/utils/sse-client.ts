import type { SSEEvent } from "../types";

/**
 * Configuration for SSE client
 */
export interface SSEClientConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  timeout?: number;
  withCredentials?: boolean;
}

/**
 * Event handler types
 */
export type SSEEventHandler = (event: SSEEvent) => void;
export type SSEErrorHandler = (error: Event) => void;
export type SSEOpenHandler = () => void;
export type SSECloseHandler = () => void;

/**
 * SSE Client for consuming server-sent events
 */
export class SSEClient {
  private config: Required<SSEClientConfig>;
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private isConnecting = false;
  private isConnected = false;

  // Event handlers
  private eventHandlers: Map<string, SSEEventHandler[]> = new Map();
  private errorHandlers: SSEErrorHandler[] = [];
  private openHandlers: SSEOpenHandler[] = [];
  private closeHandlers: SSECloseHandler[] = [];

  constructor(config: SSEClientConfig) {
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      timeout: 30000,
      withCredentials: false,
      ...config,
    };
  }

  /**
   * Connect to the SSE endpoint
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnecting || this.isConnected) {
        resolve();
        return;
      }

      this.isConnecting = true;

      try {
        this.eventSource = new EventSource(this.config.url, {
          withCredentials: this.config.withCredentials,
        });

        // Set up event listeners
        this.setupEventListeners();

        // Handle connection timeout
        const timeoutId = setTimeout(() => {
          if (!this.isConnected) {
            this.cleanup();
            reject(new Error("Connection timeout"));
          }
        }, this.config.timeout);

        // Override the open handler to clear timeout
        const originalOpenHandlers = [...this.openHandlers];
        this.openHandlers = [
          () => {
            this.isConnected = true;
            this.isConnecting = false;
            this.reconnectAttempts = 0;
            clearTimeout(timeoutId);
            originalOpenHandlers.forEach(handler => handler());
            resolve();
          },
        ];
             } catch (error) {
         this.isConnecting = false;
         reject(error instanceof Error ? error : new Error(String(error)));
       }
    });
  }

  /**
   * Disconnect from the SSE endpoint
   */
  disconnect(): void {
    this.cleanup();
    this.isConnected = false;
    this.isConnecting = false;
  }

  /**
   * Add an event handler for a specific event type
   */
  on(eventType: string, handler: SSEEventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  /**
   * Remove an event handler for a specific event type
   */
  off(eventType: string, handler: SSEEventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Add an error handler
   */
  onError(handler: SSEErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Add a connection open handler
   */
  onOpen(handler: SSEOpenHandler): void {
    this.openHandlers.push(handler);
  }

  /**
   * Add a connection close handler
   */
  onClose(handler: SSECloseHandler): void {
    this.closeHandlers.push(handler);
  }

  /**
   * Get connection status
   */
  get isConnectedStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Set up event listeners for the EventSource
   */
  private setupEventListeners(): void {
    if (!this.eventSource) return;

    // Handle connection open
    this.eventSource.onopen = () => {
      this.isConnected = true;
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.openHandlers.forEach(handler => handler());
    };

    // Handle connection close (EventSource doesn't have onclose, we'll handle it in onerror)
    // The connection close will be detected in the onerror handler

    // Handle errors
    this.eventSource.onerror = (error) => {
      this.errorHandlers.forEach(handler => handler(error));
      
      // If the connection is closed, attempt to reconnect
      if (this.eventSource?.readyState === EventSource.CLOSED) {
        this.attemptReconnect();
      }
    };

    // Handle messages
    this.eventSource.onmessage = (event) => {
      try {
        const sseEvent = this.parseSSEEvent(event);
        if (sseEvent) {
          this.handleEvent(sseEvent);
        }
             } catch (error) {
         console.error("Error parsing SSE event:", error instanceof Error ? error.message : String(error));
       }
    };

    // Handle specific event types
    this.eventSource.addEventListener("notification", (event) => {
      this.handleSSEEvent("notification", event);
    });

    this.eventSource.addEventListener("user_update", (event) => {
      this.handleSSEEvent("user_update", event);
    });

    this.eventSource.addEventListener("reel_upload", (event) => {
      this.handleSSEEvent("reel_upload", event);
    });

    this.eventSource.addEventListener("search_result", (event) => {
      this.handleSSEEvent("search_result", event);
    });

    this.eventSource.addEventListener("system_message", (event) => {
      this.handleSSEEvent("system_message", event);
    });

    this.eventSource.addEventListener("heartbeat", (event) => {
      this.handleSSEEvent("heartbeat", event);
    });

    this.eventSource.addEventListener("ping", (event) => {
      this.handleSSEEvent("ping", event);
    });
  }

  /**
   * Handle SSE event from EventSource
   */
  private handleSSEEvent(eventType: string, event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data) as Record<string, unknown>;
      const sseEvent: SSEEvent = {
        type: eventType as SSEEvent["type"],
        data,
        timestamp: Date.now(),
        id: event.lastEventId || undefined,
      };
      this.handleEvent(sseEvent);
    } catch (error) {
      console.error(`Error parsing ${eventType} event:`, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Parse a generic SSE event
   */
  private parseSSEEvent(event: MessageEvent): SSEEvent | null {
    try {
      const data = JSON.parse(event.data) as Record<string, unknown>;
      return {
        type: "system_message", // Default type
        data,
        timestamp: Date.now(),
        id: event.lastEventId || undefined,
      };
    } catch {
      return null;
    }
  }

  /**
   * Handle an SSE event by calling appropriate handlers
   */
  private handleEvent(event: SSEEvent): void {
    // Call handlers for the specific event type
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
               } catch (error) {
         console.error(`Error in event handler for ${event.type}:`, error instanceof Error ? error.message : String(error));
       }
      });
    }

    // Call handlers for all events
    const allHandlers = this.eventHandlers.get("*");
    if (allHandlers) {
      allHandlers.forEach(handler => {
        try {
          handler(event);
               } catch (error) {
         console.error("Error in general event handler:", error instanceof Error ? error.message : String(error));
       }
      });
    }
  }

  /**
   * Attempt to reconnect to the SSE endpoint
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.cleanup();
             this.connect().catch(error => {
         console.error("Reconnection failed:", error instanceof Error ? error.message : String(error));
       });
    }, this.config.reconnectInterval);
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}

/**
 * Create a simple SSE client with default configuration
 */
export function createSSEClient(url: string, config?: Partial<SSEClientConfig>): SSEClient {
  return new SSEClient({ url, ...config });
}

/**
 * React hook for using SSE client (for future use)
 */
export function useSSE(url: string, config?: Partial<SSEClientConfig>) {
  // This would be implemented as a React hook
  // For now, just return the client creation function
  return () => createSSEClient(url, config);
} 
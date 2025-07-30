/**
 * Client-side SSE utilities for connecting to and managing SSE streams
 * Provides reconnection logic, event handling, and error management
 */

import type { EventPayload, SSEError } from "../types";

/**
 * SSE client configuration options
 */
export interface SSEClientConfig {
  /** SSE endpoint URL */
  endpoint: string;
  /** Automatic reconnection settings */
  reconnect?: {
    enabled: boolean;
    maxAttempts: number;
    initialDelay: number; // milliseconds
    maxDelay: number; // milliseconds
    backoffMultiplier: number;
  };
  /** Connection timeout in milliseconds */
  timeout?: number;
  /** Additional headers to send with the connection */
  headers?: Record<string, string>;
  /** Query parameters to include in the connection */
  params?: Record<string, string>;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * SSE connection states
 */
export enum SSEConnectionState {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  RECONNECTING = "reconnecting",
  ERROR = "error",
  CLOSED = "closed",
}

/**
 * SSE event handler function type
 */
export type SSEEventHandler<T = any> = (data: T, event: MessageEvent) => void;

/**
 * SSE error handler function type
 */
export type SSEErrorHandler = (error: SSEError | Error, event?: Event) => void;

/**
 * SSE connection state change handler
 */
export type SSEStateChangeHandler = (
  state: SSEConnectionState,
  previousState: SSEConnectionState,
) => void;

/**
 * Default SSE client configuration
 */
const DEFAULT_CONFIG: Required<Omit<SSEClientConfig, "endpoint">> = {
  reconnect: {
    enabled: true,
    maxAttempts: 5,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
  },
  timeout: 30000,
  headers: {},
  params: {},
  debug: false,
};

/**
 * Client-side SSE connection manager
 */
export class SSEClient {
  private config: Required<SSEClientConfig>;
  private eventSource: EventSource | null = null;
  private state: SSEConnectionState = SSEConnectionState.DISCONNECTED;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private connectionTimer: NodeJS.Timeout | null = null;

  // Event handlers
  private eventHandlers = new Map<string, Set<SSEEventHandler>>();
  private errorHandlers = new Set<SSEErrorHandler>();
  private stateChangeHandlers = new Set<SSEStateChangeHandler>();

  constructor(config: SSEClientConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.log("SSE Client initialized", { config: this.config });
  }

  /**
   * Connect to the SSE endpoint
   */
  async connect(): Promise<void> {
    if (
      this.state === SSEConnectionState.CONNECTED ||
      this.state === SSEConnectionState.CONNECTING
    ) {
      this.log("Already connected or connecting");
      return;
    }

    this.setState(SSEConnectionState.CONNECTING);
    this.log("Connecting to SSE endpoint", { endpoint: this.config.endpoint });

    try {
      await this.establishConnection();
    } catch (error) {
      this.handleConnectionError(error as Error);
    }
  }

  /**
   * Disconnect from the SSE endpoint
   */
  disconnect(): void {
    this.log("Disconnecting from SSE endpoint");

    // Clear reconnection timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Clear connection timeout
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }

    // Close event source
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.reconnectAttempts = 0;
    this.setState(SSEConnectionState.DISCONNECTED);
  }

  /**
   * Add event listener for specific event types
   */
  on<T = any>(eventName: string, handler: SSEEventHandler<T>): void {
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, new Set());
    }
    this.eventHandlers.get(eventName)!.add(handler as SSEEventHandler);
    this.log("Event handler added", { eventName });
  }

  /**
   * Remove event listener for specific event types
   */
  off(eventName: string, handler?: SSEEventHandler): void {
    const handlers = this.eventHandlers.get(eventName);
    if (!handlers) return;

    if (handler) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(eventName);
      }
    } else {
      this.eventHandlers.delete(eventName);
    }
    this.log("Event handler removed", { eventName });
  }

  /**
   * Add error handler
   */
  onError(handler: SSEErrorHandler): void {
    this.errorHandlers.add(handler);
    this.log("Error handler added");
  }

  /**
   * Remove error handler
   */
  offError(handler: SSEErrorHandler): void {
    this.errorHandlers.delete(handler);
    this.log("Error handler removed");
  }

  /**
   * Add state change handler
   */
  onStateChange(handler: SSEStateChangeHandler): void {
    this.stateChangeHandlers.add(handler);
    this.log("State change handler added");
  }

  /**
   * Remove state change handler
   */
  offStateChange(handler: SSEStateChangeHandler): void {
    this.stateChangeHandlers.delete(handler);
    this.log("State change handler removed");
  }

  /**
   * Get current connection state
   */
  getState(): SSEConnectionState {
    return this.state;
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.state === SSEConnectionState.CONNECTED;
  }

  /**
   * Get current reconnection attempt count
   */
  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  /**
   * Establish the SSE connection
   */
  private async establishConnection(): Promise<void> {
    const url = this.buildConnectionUrl();

    this.eventSource = new EventSource(url);

    // Set connection timeout
    this.connectionTimer = setTimeout(() => {
      if (this.state === SSEConnectionState.CONNECTING) {
        this.handleConnectionError(new Error("Connection timeout"));
      }
    }, this.config.timeout);

    // Handle connection open
    this.eventSource.onopen = (event) => {
      this.log("SSE connection opened");

      if (this.connectionTimer) {
        clearTimeout(this.connectionTimer);
        this.connectionTimer = null;
      }

      this.reconnectAttempts = 0;
      this.setState(SSEConnectionState.CONNECTED);
    };

    // Handle generic messages
    this.eventSource.onmessage = (event) => {
      this.handleMessage("message", event);
    };

    // Handle connection errors
    this.eventSource.onerror = (event) => {
      this.log("SSE connection error", { event });

      if (this.connectionTimer) {
        clearTimeout(this.connectionTimer);
        this.connectionTimer = null;
      }

      // Check if this is a connection failure or just a temporary error
      if (this.eventSource?.readyState === EventSource.CLOSED) {
        this.handleConnectionError(new Error("SSE connection closed"));
      } else {
        this.handleConnectionError(new Error("SSE connection error"));
      }
    };

    // Set up custom event listeners for known event types
    this.setupCustomEventListeners();
  }

  /**
   * Set up listeners for custom event types
   */
  private setupCustomEventListeners(): void {
    if (!this.eventSource) return;

    // Listen for heartbeat/ping events
    this.eventSource.addEventListener("ping", (event) => {
      this.log("Received heartbeat ping");
      this.handleMessage("ping", event);
    });

    // Listen for error events from server
    this.eventSource.addEventListener("error", (event) => {
      this.log("Received server error event");
      this.handleMessage("error", event as MessageEvent);
    });

    // Listen for connection confirmation
    this.eventSource.addEventListener("connected", (event) => {
      this.log("Received connection confirmation");
      this.handleMessage("connected", event as MessageEvent);
    });
  }

  /**
   * Handle incoming SSE messages
   */
  private handleMessage(eventType: string, event: MessageEvent): void {
    try {
      let data: any;

      // Try to parse JSON data
      if (event.data) {
        try {
          data = JSON.parse(event.data);
        } catch {
          // If not JSON, use raw data
          data = event.data;
        }
      }

      this.log("Received SSE message", { eventType, data });

      // Handle special event types
      if (eventType === "ping") {
        // Heartbeat received, connection is healthy
        return;
      }

      if (eventType === "error") {
        // Server sent an error event
        const error: SSEError = data || {
          code: "SERVER_ERROR",
          message: "Server error received",
          timestamp: new Date().toISOString(),
        };
        this.emitError(error, event);
        return;
      }

      // Emit to registered handlers
      const handlers = this.eventHandlers.get(eventType);
      if (handlers) {
        handlers.forEach((handler) => {
          try {
            handler(data, event);
          } catch (error) {
            this.log("Error in event handler", { eventType, error });
            this.emitError(error as Error);
          }
        });
      }

      // Also emit to generic 'message' handlers if this was a custom event
      if (eventType !== "message") {
        const messageHandlers = this.eventHandlers.get("message");
        if (messageHandlers) {
          messageHandlers.forEach((handler) => {
            try {
              handler(data, event);
            } catch (error) {
              this.log("Error in message handler", { eventType, error });
              this.emitError(error as Error);
            }
          });
        }
      }
    } catch (error) {
      this.log("Error handling SSE message", { eventType, error });
      this.emitError(error as Error, event);
    }
  }

  /**
   * Handle connection errors and implement reconnection logic
   */
  private handleConnectionError(error: Error): void {
    this.log("Connection error occurred", { error: error.message });

    this.setState(SSEConnectionState.ERROR);
    this.emitError(error);

    // Close current connection
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    // Attempt reconnection if enabled
    if (
      this.config.reconnect.enabled &&
      this.reconnectAttempts < this.config.reconnect.maxAttempts
    ) {
      this.scheduleReconnection();
    } else {
      this.log("Max reconnection attempts reached or reconnection disabled");
      this.setState(SSEConnectionState.CLOSED);
    }
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnection(): void {
    this.reconnectAttempts++;

    const delay = Math.min(
      this.config.reconnect.initialDelay *
        Math.pow(
          this.config.reconnect.backoffMultiplier,
          this.reconnectAttempts - 1,
        ),
      this.config.reconnect.maxDelay,
    );

    this.log("Scheduling reconnection", {
      attempt: this.reconnectAttempts,
      delay,
      maxAttempts: this.config.reconnect.maxAttempts,
    });

    this.setState(SSEConnectionState.RECONNECTING);

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;

      try {
        await this.establishConnection();
      } catch (error) {
        this.handleConnectionError(error as Error);
      }
    }, delay);
  }

  /**
   * Build the connection URL with parameters
   */
  private buildConnectionUrl(): string {
    const url = new URL(this.config.endpoint, window.location.origin);

    // Add query parameters
    Object.entries(this.config.params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    return url.toString();
  }

  /**
   * Set connection state and notify handlers
   */
  private setState(newState: SSEConnectionState): void {
    const previousState = this.state;
    this.state = newState;

    this.log("State changed", { from: previousState, to: newState });

    // Notify state change handlers
    this.stateChangeHandlers.forEach((handler) => {
      try {
        handler(newState, previousState);
      } catch (error) {
        this.log("Error in state change handler", { error });
      }
    });
  }

  /**
   * Emit error to error handlers
   */
  private emitError(error: Error | SSEError, event?: Event): void {
    this.errorHandlers.forEach((handler) => {
      try {
        handler(error, event);
      } catch (handlerError) {
        this.log("Error in error handler", { handlerError });
      }
    });
  }

  /**
   * Debug logging
   */
  private log(message: string, data?: any): void {
    if (this.config.debug) {
      console.log(`[SSEClient] ${message}`, data || "");
    }
  }
}

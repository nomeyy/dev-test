/**
 * SSE Client Utilities
 * --------------------
 * Client-side utilities for connecting to and managing SSE streams
 */

import type { SSEClientOptions, SSEEvent } from "../types";

export interface SSEEventHandler<T = unknown> {
  (event: SSEEvent<T>): void;
}

export interface SSEErrorHandler {
  (error: Event): void;
}

export class SSEClient {
  private eventSource: EventSource | null = null;
  private eventHandlers = new Map<string, Set<SSEEventHandler>>();
  private errorHandlers = new Set<SSEErrorHandler>();
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isManuallyDisconnected = false;

  private readonly options: Required<SSEClientOptions>;

  constructor(
    private url: string,
    options: SSEClientOptions = {},
  ) {
    this.options = {
      autoReconnect: options.autoReconnect ?? true,
      reconnectDelay: options.reconnectDelay ?? 1000,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 5,
      headers: options.headers ?? {},
    };
  }

  /**
   * Connect to the SSE endpoint
   */
  connect(): void {
    if (this.eventSource?.readyState === EventSource.OPEN) {
      console.warn("SSE client is already connected");
      return;
    }

    this.isManuallyDisconnected = false;
    this.createEventSource();
  }

  /**
   * Disconnect from the SSE endpoint
   */
  disconnect(): void {
    this.isManuallyDisconnected = true;
    this.clearReconnectTimeout();

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  /**
   * Add event listener for specific event type
   */
  addEventListener<T>(eventType: string, handler: SSEEventHandler<T>): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(handler as SSEEventHandler);
  }

  /**
   * Remove event listener for specific event type
   */
  removeEventListener<T>(eventType: string, handler: SSEEventHandler<T>): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.delete(handler as SSEEventHandler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(eventType);
      }
    }
  }

  /**
   * Add error handler
   */
  addErrorHandler(handler: SSEErrorHandler): void {
    this.errorHandlers.add(handler);
  }

  /**
   * Remove error handler
   */
  removeErrorHandler(handler: SSEErrorHandler): void {
    this.errorHandlers.delete(handler);
  }

  /**
   * Get current connection state
   */
  getReadyState(): number {
    return this.eventSource?.readyState ?? EventSource.CLOSED;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }

  /**
   * Create EventSource connection
   */
  private createEventSource(): void {
    try {
      // Create EventSource with custom headers if supported
      const eventSourceInitDict: EventSourceInit = {};

      // Note: EventSource doesn't support custom headers in all browsers
      // For custom headers, you might need to use fetch with streaming
      this.eventSource = new EventSource(this.url, eventSourceInitDict);

      // Handle connection open
      this.eventSource.onopen = () => {
        console.log("SSE connection established");
        this.reconnectAttempts = 0;
      };

      // Handle errors
      this.eventSource.onerror = (error) => {
        console.error("SSE connection error:", error);

        // Notify error handlers
        this.errorHandlers.forEach((handler) => handler(error));

        // Attempt reconnection if not manually disconnected
        if (!this.isManuallyDisconnected && this.options.autoReconnect) {
          this.attemptReconnect();
        }
      };

      // Handle default message events
      this.eventSource.onmessage = (event) => {
        this.handleEvent("message", event.data);
      };

      // Set up custom event listeners
      this.setupEventListeners();
    } catch (error) {
      console.error("Failed to create SSE connection:", error);
      if (this.options.autoReconnect && !this.isManuallyDisconnected) {
        this.attemptReconnect();
      }
    }
  }

  /**
   * Setup custom event listeners on EventSource
   */
  private setupEventListeners(): void {
    if (!this.eventSource) return;

    // Add listeners for all registered event types
    for (const eventType of this.eventHandlers.keys()) {
      this.eventSource.addEventListener(eventType, (event) => {
        this.handleEvent(eventType, (event as MessageEvent).data);
      });
    }
  }

  /**
   * Handle incoming SSE event
   */
  private handleEvent(eventType: string, data: string): void {
    try {
      const eventData = JSON.parse(data);
      const sseEvent: SSEEvent = {
        type: eventType,
        data: eventData,
      };

      // Call registered handlers for this event type
      const handlers = this.eventHandlers.get(eventType);
      if (handlers) {
        handlers.forEach((handler) => {
          try {
            handler(sseEvent);
          } catch (error) {
            console.error(
              `Error in SSE event handler for ${eventType}:`,
              error,
            );
          }
        });
      }
    } catch (error) {
      console.error(`Failed to parse SSE event data for ${eventType}:`, error);
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      return;
    }

    this.reconnectAttempts++;
    const delay =
      this.options.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(
      `Attempting SSE reconnection (${this.reconnectAttempts}/${this.options.maxReconnectAttempts}) in ${delay}ms`,
    );

    this.reconnectTimeout = setTimeout(() => {
      if (!this.isManuallyDisconnected) {
        this.createEventSource();
      }
    }, delay);
  }

  /**
   * Clear reconnection timeout
   */
  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }
}

/**
 * Create a new SSE client instance
 */
export function createSSEClient(
  url: string,
  options?: SSEClientOptions,
): SSEClient {
  return new SSEClient(url, options);
}

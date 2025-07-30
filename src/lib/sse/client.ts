import type { SSEConnectionOptions } from "./types";

export interface SSEEvent {
  id?: string;
  event: string;
  data: any;
}

export interface SSEConnection {
  clientId: string;
  userId?: string;
  sessionId?: string;
  isConnected: boolean;
  close: () => void;
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string, callback: (data: any) => void) => void;
}

export interface SSEOptions extends SSEConnectionOptions {
  onConnect?: (connection: SSEConnection) => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (event: SSEEvent) => void;
  retryInterval?: number;
  maxRetries?: number;
}

class SSEClient {
  private eventSource: EventSource | null = null;
  private eventListeners: Map<string, Set<(data: any) => void>> = new Map();
  private options: SSEOptions;
  private clientId: string | null = null;
  private retryCount = 0;
  private retryTimeout: NodeJS.Timeout | null = null;
  private keepaliveInterval: NodeJS.Timeout | null = null;
  private connectionStartTime: number | null = null;
  private isManualDisconnect: boolean = false;
  private lastPingTime: number | null = null;

  constructor(options: SSEOptions = {}) {
    this.options = {
      retryInterval: 5000,
      maxRetries: 5,
      ...options,
    };
  }

  /**
   * Connect to the SSE endpoint
   */
  connect(): Promise<SSEConnection> {
    return new Promise((resolve, reject) => {
      try {
        // Reset manual disconnect flag
        this.isManualDisconnect = false;

        // Build the SSE URL with query parameters
        const url = new URL("/api/sse", window.location.origin);

        if (this.options.userId) {
          url.searchParams.set("userId", this.options.userId);
        }
        if (this.options.sessionId) {
          url.searchParams.set("sessionId", this.options.sessionId);
        }
        if (this.options.clientId) {
          url.searchParams.set("clientId", this.options.clientId);
        }

        console.log("SSE: Creating EventSource with URL:", url.toString());

        // Create EventSource
        this.eventSource = new EventSource(url.toString());

        // Set up event listeners
        this.eventSource.onopen = () => {
          console.log("SSE: ✅ Connection established");
          console.log(
            "SSE: EventSource readyState:",
            this.eventSource?.readyState,
          );
          this.retryCount = 0;
          this.connectionStartTime = Date.now();

          // Start keepalive immediately
          this.startKeepalive();
        };

        this.eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log(
              "SSE: Received default message event:",
              event.type,
              data,
            );
            console.log("SSE: Raw event data:", event.data);
            this.handleEvent(event.type || "message", data);
          } catch (error) {
            console.error("SSE: Error parsing message:", error);
            console.error(
              "SSE: Raw event data that failed to parse:",
              event.data,
            );
          }
        };

        this.eventSource.onerror = (error) => {
          console.error("SSE: Connection error:", error);
          console.log(
            "SSE: EventSource readyState on error:",
            this.eventSource?.readyState,
          );

          // Don't immediately handle error - check if it's a real disconnection
          setTimeout(() => {
            if (
              this.eventSource &&
              this.eventSource.readyState === EventSource.CLOSED
            ) {
              console.log("SSE: Connection is actually closed, handling error");

              // Only handle error if it wasn't a manual disconnect
              if (!this.isManualDisconnect) {
                console.log(
                  "SSE: Not a manual disconnect, attempting reconnection",
                );
                this.handleError(error);
              } else {
                console.log(
                  "SSE: Manual disconnect detected, not reconnecting",
                );
              }
            } else {
              console.log(
                "SSE: Connection error but EventSource is still open, ignoring",
              );
            }
          }, 2000); // Wait 2 seconds to see if connection recovers
        };

        // Listen for specific events
        this.eventSource.addEventListener("connected", (event) => {
          try {
            const data = JSON.parse(event.data);
            this.clientId = data.clientId;
            console.log("SSE: Connected with client ID:", this.clientId);
            console.log(
              "SSE: Connection event received, keeping connection alive",
            );

            // Start keepalive after receiving connection event
            this.startKeepalive();

            if (this.options.onConnect) {
              this.options.onConnect(this.createConnection());
            }
          } catch (error) {
            console.error("SSE: Error parsing connection event:", error);
          }
        });

        this.eventSource.addEventListener("ping", (event) => {
          try {
            const data = JSON.parse(event.data);
            this.lastPingTime = Date.now();
            console.log("SSE: Received ping:", data.timestamp);
            console.log("SSE: Last ping time updated:", this.lastPingTime);
          } catch (error) {
            console.error("SSE: Error parsing ping event:", error);
          }
        });

        // Use a more robust approach - listen for all events dynamically
        const handleCustomEvent = (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            console.log(`SSE: Received ${event.type} event:`, data);
            console.log(`SSE: Raw ${event.type} event data:`, event.data);
            this.handleEvent(event.type, data);
          } catch (error) {
            console.error(`SSE: Error parsing ${event.type} event:`, error);
            console.error(
              `SSE: Raw ${event.type} event data that failed to parse:`,
              event.data,
            );
          }
        };

        // Listen for all our custom event types
        [
          "custom-message",
          "test-message",
          "test-broadcast",
          "user-notification",
          "debug-test",
        ].forEach((eventType) => {
          this.eventSource!.addEventListener(eventType, handleCustomEvent);
        });

        // Add a fallback listener for any other events
        this.eventSource.addEventListener("message", (event) => {
          console.log("SSE: Fallback message listener triggered");
          console.log("SSE: Event type:", event.type);
          console.log("SSE: Event data:", event.data);
        });

        // Resolve with connection object
        resolve(this.createConnection());

        // Add browser visibility change handler to prevent disconnection
        const handleVisibilityChange = () => {
          if (document.hidden) {
            console.log("SSE: 📱 Tab hidden, keeping connection alive");
          } else {
            console.log("SSE: 📱 Tab visible, connection should be active");
          }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        // Add page unload handler to mark as manual disconnect
        const handleBeforeUnload = () => {
          console.log("SSE: 📱 Page unloading, marking as manual disconnect");
          this.isManualDisconnect = true;
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the SSE endpoint
   */
  disconnect(): void {
    console.log("SSE: 🔌 Disconnect called");
    console.log(
      "SSE: EventSource state before disconnect:",
      this.eventSource?.readyState,
    );

    // Mark as manual disconnect
    this.isManualDisconnect = true;

    // Don't disconnect if we're in the middle of connecting
    if (this.eventSource?.readyState === EventSource.CONNECTING) {
      console.log("SSE: ⚠️ Preventing disconnect while connecting");
      return;
    }

    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    if (this.keepaliveInterval) {
      clearInterval(this.keepaliveInterval);
      this.keepaliveInterval = null;
    }

    if (this.eventSource) {
      console.log("SSE: Closing EventSource");
      this.eventSource.close();
      this.eventSource = null;
    }

    this.clientId = null;
    this.eventListeners.clear();
    this.connectionStartTime = null;
    this.lastPingTime = null;

    if (this.options.onDisconnect) {
      console.log("SSE: Calling onDisconnect callback");
      this.options.onDisconnect();
    }

    console.log("SSE: Disconnected");
  }

  /**
   * Add an event listener
   */
  on(event: string, callback: (data: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);

    // Also listen for the event on the EventSource if it's not already set up
    if (this.eventSource && !this.eventSource.onmessage) {
      this.eventSource.addEventListener(event, (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleEvent(event.type, data);
        } catch (error) {
          console.error(`SSE: Error parsing ${event.type} event:`, error);
        }
      });
    }
  }

  /**
   * Remove an event listener
   */
  off(event: string, callback: (data: any) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  /**
   * Handle incoming events
   */
  private handleEvent(event: string, data: any): void {
    console.log(`📥 SSE: Received event "${event}"`);
    console.log(`📥 SSE: Event data:`, data);
    console.log(`📥 SSE: Client ID: ${this.clientId}`);

    // Call global message handler
    if (this.options.onMessage) {
      console.log(`📥 SSE: Calling global onMessage handler`);
      this.options.onMessage({ event, data });
    }

    // Call specific event listeners
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      console.log(
        `📥 SSE: Calling ${listeners.size} specific event listeners for "${event}"`,
      );
      listeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`SSE: Error in event listener for ${event}:`, error);
        }
      });
    } else {
      console.log(`📥 SSE: No specific event listeners found for "${event}"`);
    }
  }

  /**
   * Handle connection errors and retry
   */
  private handleError(error: Event): void {
    console.log("SSE: Connection error occurred:", error);

    if (this.options.onError) {
      this.options.onError(error);
    }

    // Don't reconnect if this was a manual disconnect
    if (this.isManualDisconnect) {
      console.log("SSE: Manual disconnect detected, not reconnecting");
      return;
    }

    // Check if the connection is actually broken
    if (
      this.eventSource &&
      this.eventSource.readyState === EventSource.CLOSED
    ) {
      console.log("SSE: EventSource is closed, attempting reconnection");

      // Only attempt to reconnect if explicitly enabled and we haven't exceeded max retries
      if (
        this.options.maxRetries &&
        this.retryCount < this.options.maxRetries
      ) {
        this.retryCount++;
        console.log(
          `SSE: Retrying connection (${this.retryCount}/${this.options.maxRetries})...`,
        );

        this.retryTimeout = setTimeout(() => {
          this.disconnect();
          this.connect().catch(console.error);
        }, this.options.retryInterval || 5000);
      } else {
        console.error("SSE: Connection error - not retrying automatically");
        // Don't automatically disconnect on error to allow manual reconnection
      }
    } else {
      console.log("SSE: EventSource is still open, not reconnecting");
    }
  }

  /**
   * Start keepalive mechanism
   */
  private startKeepalive(): void {
    if (this.keepaliveInterval) {
      clearInterval(this.keepaliveInterval);
    }

    this.keepaliveInterval = setInterval(() => {
      if (
        this.eventSource &&
        this.eventSource.readyState === EventSource.OPEN
      ) {
        console.log("SSE: 💓 Keepalive - connection still open");
        console.log(
          "SSE: 💓 Connection duration:",
          Date.now() - (this.connectionStartTime || 0),
          "ms",
        );
        console.log(
          "SSE: 💓 Last ping time:",
          this.lastPingTime
            ? Date.now() - this.lastPingTime + "ms ago"
            : "never",
        );

        // If we haven't received a ping in 60 seconds, log a warning
        if (this.lastPingTime && Date.now() - this.lastPingTime > 60000) {
          console.log(
            "SSE: ⚠️ No ping received in 60 seconds, connection might be stale",
          );
        }
      } else {
        console.log(
          "SSE: 💓 Keepalive - connection not open, readyState:",
          this.eventSource?.readyState,
        );

        // If connection is closed and it wasn't a manual disconnect, try to reconnect
        if (
          this.eventSource?.readyState === EventSource.CLOSED &&
          !this.isManualDisconnect
        ) {
          console.log("SSE: 🔄 Connection closed, attempting reconnection");
          this.connect().catch(console.error);
        }
      }
    }, 10000); // Check every 10 seconds instead of 5
  }

  /**
   * Create a connection object
   */
  private createConnection(): SSEConnection {
    return {
      clientId: this.clientId || "",
      userId: this.options.userId,
      sessionId: this.options.sessionId,
      isConnected: this.eventSource?.readyState === EventSource.OPEN,
      close: () => this.disconnect(),
      on: (event: string, callback: (data: any) => void) =>
        this.on(event, callback),
      off: (event: string, callback: (data: any) => void) =>
        this.off(event, callback),
    };
  }
}

// Export a function to create SSE connections
export function createSSEConnection(options: SSEOptions = {}): SSEClient {
  return new SSEClient(options);
}

// Export a simple hook-like function for React components
export function useSSE(options: SSEOptions = {}) {
  const client = new SSEClient(options);

  return {
    connect: () => client.connect(),
    disconnect: () => client.disconnect(),
    on: (event: string, callback: (data: any) => void) =>
      client.on(event, callback),
    off: (event: string, callback: (data: any) => void) =>
      client.off(event, callback),
  };
}

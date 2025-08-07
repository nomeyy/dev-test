// lib/init-sse.ts
import { unifiedSSEService } from "../features/sse/unified-sse-service";
import { logger } from "@/utils/logging";

const initLogger = logger.createContextLogger("SSE-Init");

let isInitialized = false;
let initPromise: Promise<void> | null = null;

export interface SSEInitOptions {
  heartbeatInterval?: number;
  clientTimeout?: number;
  maxQueueSize?: number;
  enableRedisSync?: boolean;
  autoStart?: boolean;
}

/**
 * Initialize the SSE service with optional configuration
 */
export async function initializeSSE(
  options: SSEInitOptions = {},
): Promise<void> {
  if (isInitialized) {
    initLogger.debug("SSE service already initialized");
    return;
  }

  if (initPromise) {
    initLogger.debug("SSE initialization already in progress");
    return initPromise;
  }

  const {
    heartbeatInterval = 20000,
    clientTimeout = 60000,
    maxQueueSize = 100,
    enableRedisSync = true,
    autoStart = true,
  } = options;

  initPromise = (async () => {
    try {
      initLogger.info("Initializing SSE service...", {
        heartbeatInterval,
        clientTimeout,
        maxQueueSize,
        enableRedisSync,
      });

      // Initialize the service (this will set up Redis sync if enabled)
      await unifiedSSEService.addClient({
        id: "init-test-client",
        response: {
          write: () => {},
          close: () => {},
        },
      });
      await unifiedSSEService.removeClient("init-test-client");

      if (autoStart) {
        // Start heartbeat
        unifiedSSEService.startHeartbeat();
      }

      // Set up graceful shutdown
      setupGracefulShutdown();

      isInitialized = true;
      initLogger.info("SSE service initialized successfully", {
        heartbeatStarted: autoStart,
      });
    } catch (error) {
      initLogger.error("Failed to initialize SSE service", error);
      throw error;
    }
  })();

  await initPromise;
  initPromise = null;
}

/**
 * Set up graceful shutdown handlers
 */
function setupGracefulShutdown(): void {
  const shutdown = async (signal: string) => {
    initLogger.info(
      `Received ${signal}, shutting down SSE service gracefully...`,
    );

    try {
      await unifiedSSEService.cleanup();
      initLogger.info("SSE service shutdown completed");
      process.exit(0);
    } catch (error) {
      initLogger.error("Error during SSE shutdown", error);
      process.exit(1);
    }
  };

  // Handle different termination signals
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // Handle uncaught exceptions
  process.on("uncaughtException", (error) => {
    initLogger.error("Uncaught exception, shutting down", error);
    unifiedSSEService.cleanup().finally(() => process.exit(1));
  });

  process.on("unhandledRejection", (reason, promise) => {
    initLogger.error("Unhandled rejection at:", promise, "reason:", reason);
    unifiedSSEService.cleanup().finally(() => process.exit(1));
  });
}

/**
 * Manual shutdown function
 */
export async function shutdownSSE(): Promise<void> {
  if (!isInitialized) {
    initLogger.debug("SSE service not initialized, nothing to shutdown");
    return;
  }

  try {
    initLogger.info("Shutting down SSE service...");
    await unifiedSSEService.cleanup();
    isInitialized = false;
    initLogger.info("SSE service shut down successfully");
  } catch (error) {
    initLogger.error("Error during manual SSE shutdown", error);
    throw error;
  }
}

/**
 * Check if SSE service is initialized
 */
export function isSSEInitialized(): boolean {
  return isInitialized;
}

// Auto-initialize in production environments
if (typeof process !== "undefined" && process.env.NODE_ENV === "production") {
  initializeSSE().catch((error) => {
    console.error("Failed to auto-initialize SSE service:", error);
  });
}

// Middleware helper for Next.js
export function withSSE<T extends (...args: any[]) => any>(handler: T): T {
  return (async (...args: any[]) => {
    if (!isInitialized) {
      await initializeSSE();
    }
    return handler(...args);
  }) as T;
}

// Express middleware (if using Express)
export function sseMiddleware() {
  return async (req: any, res: any, next: any) => {
    if (!isInitialized) {
      try {
        await initializeSSE();
      } catch (error) {
        initLogger.error("SSE middleware initialization failed", error);
        return res.status(500).json({ error: "SSE service unavailable" });
      }
    }
    next();
  };
}

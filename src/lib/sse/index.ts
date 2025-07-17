// Export types
export type {
  SSEEvent,
  SSEClient,
  SSEMessage,
  SSEConnectionOptions,
  SSEServiceType,
} from "./types";

// Export factory and service
export { createSSEService, sseService } from "./client";

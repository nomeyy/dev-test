// Export types from models
export type {
  SSEEvent,
  SSEMessage,
  SSEConnectionOptions,
  ClientSSEMessage,
  ClientSSEConnectionOptions,
} from "./models/SSEModel";

// Export Zod schemas
export {
  SSEEventSchema,
  SSEMessageSchema,
  SSEConnectionOptionsSchema,
  ClientSSEMessageSchema,
  ClientSSEConnectionOptionsSchema,
} from "./models/SSEModel";

// Export utilities
export {
  sendUserNotification,
  broadcastMessage,
  sendToClients,
  getClientCount,
  getActiveClients,
} from "./utils/sse-utils";

// Export hooks
export { useSSESubscription } from "./hooks/useSSESubscription";

// Export components
export { SSEView } from "./components/SSEView";

// Export tRPC router
export { sseRouter } from "./trpc";

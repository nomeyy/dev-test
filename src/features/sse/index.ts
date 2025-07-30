// Types
export type {
  SSEEvent,
  SSEClient,
  SSEMessage,
  SSEConnectionOptions,
  SSEManagerConfig,
} from "./types";

// Services
export { SSEManager } from "./services/sse-manager";

export {
  initializeSSE,
  getSSEManager,
  registerSSEClient,
  removeSSEClient,
  broadcastToAll,
  sendToUser,
  sendToSession,
  sendToClient,
  sendMessage,
  getSSEStats,
  destroySSE,
  generateClientId,
} from "./services/sse-service";

// Hooks
export { useSSE } from "./hooks/useSSE";

export type {
  SSEEvent as ClientSSEEvent,
  SSEConnectionState,
  UseSSEOptions,
} from "./hooks/useSSE";

// Utils
export {
  validateSSEMessage,
  validateSSEMessageWithErrors,
  validateEventData,
  sseMessageSchema,
  commonEventSchemas,
} from "./utils/validation";

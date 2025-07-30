// Types
export type {
  SSEEvent,
  SSEClient,
  SSEMessage,
  SSEConnectionOptions,
  SSEManager,
} from "./types";

// Services
export { getSSEManager, cleanupSSEManager } from "./services/sse-manager";

// Hooks
export { useSSE } from "./hooks/useSSE";

// Utils
export {
  broadcastSSE,
  sendSSEToUser,
  sendSSEToSession,
  sendSSEToClient,
  sendSSEMessage,
  getSSEClientCount,
  getSSEActiveClients,
  SSE_EVENTS,
  createNotificationEvent,
  createDataUpdateEvent,
} from "./utils/sse-utils";

// Components
export { SSEDemo } from "./components/SSEDemo";
export { SSETest } from "./components/SSETest";

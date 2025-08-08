// Services
export { SSEManager } from './services/sse-manager';
export { getSSEManager, destroySSEManager, isSSEManagerInitialized } from './services/sse-instance';

// Client
export { SSEClient } from './client/sse-client';
export type { SSEClientEvents } from './client/sse-client';

// Hooks
export { useSSE } from './hooks/useSSE';
export type { UseSSEOptions, UseSSEReturn } from './hooks/useSSE';

// Utils
export { 
  notifyUser,
  notifySession,
  notifyClient,
  broadcastNotification,
  sendSSEMessage,
  getSSEStats,
  getActiveConnections,
  notifications,
} from './utils/sse-utils';

// Types
export type {
  SSEClient as SSEClientType,
  SSEMessage,
  SSEEventPayload,
  SSEManagerConfig,
  SSEConnectionInfo,
  SSEStats,
  SSEClientOptions,
  SSEEventHandler,
  SSEConnectionState,
} from './types/index';

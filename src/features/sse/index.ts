// Core SSE Manager
export { SSEManager } from './services/sse-manager';
export { getSSEManager, destroySSEManager, isSSEManagerInitialized } from './services/sse-instance';

// Notification Service
export { SSENotificationService, sseNotificationService } from './services/notification-service';

// React Hooks
export { useSSE } from './hooks/useSSE';
export { 
  useSSEEvent, 
  useSSEHeartbeat, 
  useSSESystemNotification, 
  useSSEErrorNotification, 
  useSSESuccessNotification, 
  useSSEConnection 
} from './hooks/useSSEEvent';

// React Components
export { SSEConnectionStatus } from './components/SSEConnectionStatus';
export { SSEEventDisplay } from './components/SSEEventDisplay';
export { VideoUploadStatus } from './components/VideoUploadStatus';

// Types
export type {
  SSEClient,
  SSEEvent,
  SSEConnectionOptions,
  SSEManagerConfig,
  SSENotification,
  SSENotificationTarget,
  SSEMetrics,
  SSEEventHandler,
  SSEConnectionHandler,
  SSEDisconnectionHandler,
} from './types';

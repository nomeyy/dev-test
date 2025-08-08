import { SSEManager } from './sse-manager';
import type { SSEManagerConfig } from '../types/index';

declare global {
  var __sseManager__: SSEManager | undefined;
}

export function getSSEManager(): SSEManager {
  if (!global.__sseManager__) {
    const config: SSEManagerConfig = {
      heartbeatInterval: 30000,
      clientTimeout: 60000,
      maxConnections: 1000,
      enableLogging: process.env.NODE_ENV === 'development',
    };
    global.__sseManager__ = new SSEManager(config);
    console.log('✅ Created new global SSEManager instance');
  } else {
    console.log('♻️ Reusing global SSEManager instance');
  }

  return global.__sseManager__;
}
export function destroySSEManager(): void {
  if (global.__sseManager__) {
    global.__sseManager__.close();
    delete global.__sseManager__;
    console.log('✅ Destroyed global SSEManager instance');
  }
}

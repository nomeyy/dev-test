import { SSEManager } from './sse-manager';
import type { SSEManagerConfig } from '../types';

let sseManagerInstance: SSEManager | null = null;

/**
 * Get or create the global SSE manager instance
 */
export function getSSEManager(config?: Partial<SSEManagerConfig>): SSEManager {
  if (!sseManagerInstance) {
    sseManagerInstance = new SSEManager(config);
    
    // Set up global error handling
    sseManagerInstance.on('error', (error, clientId) => {
      console.error(`SSE Error for client ${clientId}:`, error);
    });

    sseManagerInstance.on('clientConnected', (client) => {
      console.log(`SSE Client connected: ${client.id} (User: ${client.userId || 'anonymous'})`);
    });

    sseManagerInstance.on('clientDisconnected', (clientId, reason) => {
      console.log(`SSE Client disconnected: ${clientId} (Reason: ${reason})`);
    });

    // Graceful shutdown handling
    process.on('SIGTERM', () => {
      console.log('Shutting down SSE manager...');
      sseManagerInstance?.destroy();
    });

    process.on('SIGINT', () => {
      console.log('Shutting down SSE manager...');
      sseManagerInstance?.destroy();
    });
  }

  return sseManagerInstance;
}

/**
 * Destroy the global SSE manager instance
 */
export function destroySSEManager(): void {
  if (sseManagerInstance) {
    sseManagerInstance.destroy();
    sseManagerInstance = null;
  }
}

/**
 * Check if SSE manager is initialized
 */
export function isSSEManagerInitialized(): boolean {
  return sseManagerInstance !== null;
}

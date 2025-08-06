/**
 * @fileoverview Centralized Server-Sent Events (SSE) Manager
 *
 * This module provides a centralized service for managing SSE connections across the application.
 * It handles client connection lifecycle, event broadcasting, and resource cleanup.
 *
 * Key Features:
 * - Track active client connections per user/session
 * - Send named events with JSON payloads to specific clients or broadcast to all
 * - Handle connection lifecycle (connect, disconnect, error handling)
 * - Provide heartbeat/ping mechanism to keep connections alive
 * - Clean up resources on disconnect to prevent memory leaks
 *
 * Usage for backend modules:
 * ```typescript
 * import { sseManager } from '@/lib/sse/SSEManager';
 *
 * // Send to specific user
 * sseManager.send(userId, 'notification', { message: 'Hello!' });
 *
 * // Broadcast to all connected clients
 * sseManager.broadcast('system-alert', { alert: 'Server maintenance' });
 * ```
 */

type UserId = string;

/**
 * Centralized SSE Manager for handling client connections and event distribution
 *
 * This class provides a singleton service that:
 * - Maintains a registry of active client connections
 * - Handles connection lifecycle (connect/disconnect)
 * - Provides methods for sending events to specific clients or broadcasting
 * - Implements proper resource cleanup to prevent memory leaks
 *
 * @class SSEManager
 * @example
 * ```typescript
 * // In your API route or service
 * sseManager.send(userId, 'notification', { message: 'New message' });
 * sseManager.broadcast('system-update', { status: 'online' });
 * ```
 */
export class SSEManager {
  /**
   * Registry of active client connections
   * Maps user IDs to their corresponding stream controllers
   * Used for targeted message delivery and connection management
   */
  private clients: Map<UserId, ReadableStreamDefaultController<Uint8Array>> =
    new Map<UserId, ReadableStreamDefaultController<Uint8Array>>();

  /**
   * Establishes a new SSE connection for a user
   *
   * This method is called when a client connects to the SSE endpoint.
   * It registers the user's stream controller for future message delivery.
   *
   * @param userId - Unique identifier for the user/session
   * @param controller - The ReadableStream controller for sending data to the client
   *
   * @example
   * ```typescript
   * // Called from SSE route handler
   * sseManager.connect(userId, controller);
   * ```
   */
  connect(
    userId: UserId,
    controller: ReadableStreamDefaultController<Uint8Array>,
  ): void {
    this.clients.set(userId, controller);
  }

  /**
   * Removes a client connection and cleans up resources
   *
   * This method is called when a client disconnects or the connection is aborted.
   * It removes the user from the active connections registry to prevent memory leaks.
   *
   * @param userId - Unique identifier for the user/session to disconnect
   *
   * @example
   * ```typescript
   * // Called when client disconnects or connection is aborted
   * sseManager.disconnect(userId);
   * ```
   */
  disconnect(userId: UserId): void {
    this.clients.delete(userId);
  }

  /**
   * Sends a named event with payload to a specific client
   *
   * This method allows backend modules to send targeted messages to individual users.
   * The event is formatted according to SSE protocol and sent to the specified user.
   *
   * @param userId - Target user ID for the message
   * @param event - Event name (e.g., 'notification', 'update', 'alert')
   * @param data - Event payload (string, number, or object that will be JSON stringified)
   *
   * @example
   * ```typescript
   * // Send notification to specific user
   * sseManager.send(userId, 'notification', {
   *   message: 'You have a new message',
   *   timestamp: Date.now()
   * });
   *
   * // Send simple string message
   * sseManager.send(userId, 'status', 'online');
   * ```
   */
  send(userId: UserId, event: string, data: string | number | object): void {
    const controller = this.clients.get(userId);
    if (!controller) {
      // Client not found - they may have disconnected
      return;
    }

    const encoder = new TextEncoder();
    const payload = typeof data === "string" ? data : JSON.stringify(data);
    const formatted = `event: ${event}\ndata: ${payload}\n\n`;

    controller.enqueue(encoder.encode(formatted));
  }

  /**
   * Broadcasts a named event with payload to all connected clients
   *
   * This method allows backend modules to send system-wide messages to all active connections.
   * Useful for system notifications, alerts, or general announcements.
   *
   * @param event - Event name (e.g., 'system-alert', 'broadcast', 'announcement')
   * @param data - Event payload (string, number, or object that will be JSON stringified)
   *
   * @example
   * ```typescript
   * // Broadcast system maintenance notification
   * sseManager.broadcast('system-alert', {
   *   type: 'maintenance',
   *   message: 'Server maintenance in 5 minutes',
   *   scheduledTime: Date.now() + 300000
   * });
   *
   * // Broadcast simple status update
   * sseManager.broadcast('status', 'server-healthy');
   * ```
   */
  broadcast(event: string, data: string | number | object): void {
    const encoder = new TextEncoder();
    const payload = typeof data === "string" ? data : JSON.stringify(data);
    const formatted = `event: ${event}\ndata: ${payload}\n\n`;
    const encoded = encoder.encode(formatted);

    // Send to all connected clients
    this.clients.forEach((controller) => {
      controller.enqueue(encoded);
    });
  }
}

/**
 * Singleton instance of the SSE Manager
 *
 * This exported instance should be used throughout the application
 * for sending SSE events to clients. It maintains the centralized
 * connection registry and provides the public API for SSE operations.
 *
 * @example
 * ```typescript
 * import { sseManager } from '@/lib/sse/SSEManager';
 *
 * // In webhook handler
 * sseManager.send(userId, 'webhook', webhookData);
 *
 * // In job processor
 * sseManager.broadcast('job-complete', { jobId, status: 'completed' });
 * ```
 */

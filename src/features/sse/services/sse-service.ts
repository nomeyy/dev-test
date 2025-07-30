/**
 * High-level SSE service API for backend services
 * Provides simple methods to send notifications without SSE protocol details
 */

import type { SSEServiceAPI, SSEManager } from "./interfaces";
import type { SSEEvent, SSETarget, EventPayload, SSEError } from "../types";
import { SSEConnectionManager } from "./sse-manager";

/**
 * Service error codes for SSE operations
 */
export enum SSEServiceErrorCode {
  INVALID_EVENT_NAME = "INVALID_EVENT_NAME",
  INVALID_PAYLOAD = "INVALID_PAYLOAD",
  INVALID_TARGET = "INVALID_TARGET",
  SERIALIZATION_ERROR = "SERIALIZATION_ERROR",
  CONNECTION_ERROR = "CONNECTION_ERROR",
  TARGET_NOT_FOUND = "TARGET_NOT_FOUND",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
}

/**
 * SSE service error class
 */
export class SSEServiceError extends Error {
  constructor(
    public code: SSEServiceErrorCode,
    message: string,
    public details?: any,
    public connectionId?: string,
  ) {
    super(message);
    this.name = "SSEServiceError";
  }

  toJSON(): SSEError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: new Date().toISOString(),
      connectionId: this.connectionId,
    };
  }
}

/**
 * High-level SSE service implementation
 */
export class SSEService implements SSEServiceAPI {
  private manager: SSEManager;

  constructor(manager?: SSEManager) {
    this.manager = manager || new SSEConnectionManager();
  }

  /**
   * Send a notification to a specific user
   */
  async notifyUser(
    userId: string,
    eventName: string,
    payload: any,
  ): Promise<boolean> {
    try {
      // Validate inputs
      this.validateEventName(eventName);
      this.validateUserId(userId);

      // Create and validate event
      const event = this.createEvent(eventName, payload);

      // Send to user
      const success = await this.manager.sendToUser(userId, event);

      if (!success) {
        throw new SSEServiceError(
          SSEServiceErrorCode.TARGET_NOT_FOUND,
          `No active connections found for user: ${userId}`,
          { userId, eventName },
        );
      }

      return success;
    } catch (error) {
      if (error instanceof SSEServiceError) {
        throw error;
      }

      throw new SSEServiceError(
        SSEServiceErrorCode.CONNECTION_ERROR,
        `Failed to notify user: ${error instanceof Error ? error.message : "Unknown error"}`,
        { userId, eventName, originalError: error },
      );
    }
  }

  /**
   * Send a notification to a specific session
   */
  async notifySession(
    sessionId: string,
    eventName: string,
    payload: any,
  ): Promise<boolean> {
    try {
      // Validate inputs
      this.validateEventName(eventName);
      this.validateSessionId(sessionId);

      // Create and validate event
      const event = this.createEvent(eventName, payload);

      // Send to session
      const success = await this.manager.sendToSession(sessionId, event);

      if (!success) {
        throw new SSEServiceError(
          SSEServiceErrorCode.TARGET_NOT_FOUND,
          `No active connections found for session: ${sessionId}`,
          { sessionId, eventName },
        );
      }

      return success;
    } catch (error) {
      if (error instanceof SSEServiceError) {
        throw error;
      }

      throw new SSEServiceError(
        SSEServiceErrorCode.CONNECTION_ERROR,
        `Failed to notify session: ${error instanceof Error ? error.message : "Unknown error"}`,
        { sessionId, eventName, originalError: error },
      );
    }
  }

  /**
   * Broadcast an event to all connected clients
   */
  async broadcastEvent(eventName: string, payload: any): Promise<number> {
    try {
      // Validate inputs
      this.validateEventName(eventName);

      // Create and validate event
      const event = this.createEvent(eventName, payload);

      // Broadcast to all connections
      const sentCount = await this.manager.broadcast(event);

      return sentCount;
    } catch (error) {
      if (error instanceof SSEServiceError) {
        throw error;
      }

      throw new SSEServiceError(
        SSEServiceErrorCode.CONNECTION_ERROR,
        `Failed to broadcast event: ${error instanceof Error ? error.message : "Unknown error"}`,
        { eventName, originalError: error },
      );
    }
  }

  /**
   * Send a custom event to a specific target
   */
  async sendCustomEvent(target: SSETarget, event: SSEEvent): Promise<boolean> {
    try {
      // Validate target
      this.validateTarget(target);

      // Validate event
      this.validateEvent(event);

      // Send based on target type
      switch (target.type) {
        case "user":
          if (!target.id) {
            throw new SSEServiceError(
              SSEServiceErrorCode.INVALID_TARGET,
              "User ID is required for user target",
              { target },
            );
          }
          return await this.manager.sendToUser(target.id, event);

        case "session":
          if (!target.id) {
            throw new SSEServiceError(
              SSEServiceErrorCode.INVALID_TARGET,
              "Session ID is required for session target",
              { target },
            );
          }
          return await this.manager.sendToSession(target.id, event);

        case "client":
          if (!target.id) {
            throw new SSEServiceError(
              SSEServiceErrorCode.INVALID_TARGET,
              "Client ID is required for client target",
              { target },
            );
          }
          return await this.manager.sendToClient(target.id, event);

        case "broadcast":
          const sentCount = await this.manager.broadcast(event);
          return sentCount > 0;

        default:
          throw new SSEServiceError(
            SSEServiceErrorCode.INVALID_TARGET,
            `Invalid target type: ${(target as any).type}`,
            { target },
          );
      }
    } catch (error) {
      if (error instanceof SSEServiceError) {
        throw error;
      }

      throw new SSEServiceError(
        SSEServiceErrorCode.CONNECTION_ERROR,
        `Failed to send custom event: ${error instanceof Error ? error.message : "Unknown error"}`,
        { target, originalError: error },
      );
    }
  }

  /**
   * Create a formatted event with payload
   */
  private createEvent(eventName: string, payload: any): SSEEvent {
    try {
      // Create event payload with metadata
      const eventPayload: EventPayload = {
        type: eventName,
        timestamp: new Date().toISOString(),
        data: payload,
        metadata: {
          source: "sse-service",
          version: "1.0.0",
          correlationId: this.generateCorrelationId(),
        },
      };

      // Validate serialization
      this.validateSerialization(eventPayload);

      return {
        id: this.generateEventId(),
        event: eventName,
        data: eventPayload,
        retry: 3000, // 3 seconds retry interval
      };
    } catch (error) {
      throw new SSEServiceError(
        SSEServiceErrorCode.SERIALIZATION_ERROR,
        `Failed to create event: ${error instanceof Error ? error.message : "Unknown error"}`,
        { eventName, payload, originalError: error },
      );
    }
  }

  /**
   * Validate event name
   */
  private validateEventName(eventName: string): void {
    if (!eventName || typeof eventName !== "string") {
      throw new SSEServiceError(
        SSEServiceErrorCode.INVALID_EVENT_NAME,
        "Event name must be a non-empty string",
        { eventName },
      );
    }

    if (eventName.trim().length === 0) {
      throw new SSEServiceError(
        SSEServiceErrorCode.INVALID_EVENT_NAME,
        "Event name cannot be empty or whitespace only",
        { eventName },
      );
    }

    // Check for invalid characters in event names
    if (!/^[a-zA-Z0-9_-]+$/.test(eventName)) {
      throw new SSEServiceError(
        SSEServiceErrorCode.INVALID_EVENT_NAME,
        "Event name can only contain letters, numbers, underscores, and hyphens",
        { eventName },
      );
    }
  }

  /**
   * Validate user ID
   */
  private validateUserId(userId: string): void {
    if (!userId || typeof userId !== "string") {
      throw new SSEServiceError(
        SSEServiceErrorCode.INVALID_TARGET,
        "User ID must be a non-empty string",
        { userId },
      );
    }
  }

  /**
   * Validate session ID
   */
  private validateSessionId(sessionId: string): void {
    if (!sessionId || typeof sessionId !== "string") {
      throw new SSEServiceError(
        SSEServiceErrorCode.INVALID_TARGET,
        "Session ID must be a non-empty string",
        { sessionId },
      );
    }
  }

  /**
   * Validate target object
   */
  private validateTarget(target: SSETarget): void {
    if (!target || typeof target !== "object") {
      throw new SSEServiceError(
        SSEServiceErrorCode.INVALID_TARGET,
        "Target must be a valid object",
        { target },
      );
    }

    const validTypes = ["user", "session", "client", "broadcast"];
    if (!validTypes.includes(target.type)) {
      throw new SSEServiceError(
        SSEServiceErrorCode.INVALID_TARGET,
        `Target type must be one of: ${validTypes.join(", ")}`,
        { target },
      );
    }

    // Validate ID is provided for non-broadcast targets
    if (target.type !== "broadcast" && !target.id) {
      throw new SSEServiceError(
        SSEServiceErrorCode.INVALID_TARGET,
        `Target ID is required for ${target.type} targets`,
        { target },
      );
    }
  }

  /**
   * Validate SSE event object
   */
  private validateEvent(event: SSEEvent): void {
    if (!event || typeof event !== "object") {
      throw new SSEServiceError(
        SSEServiceErrorCode.INVALID_PAYLOAD,
        "Event must be a valid object",
        { event },
      );
    }

    // Validate event name if provided
    if (event.event && typeof event.event !== "string") {
      throw new SSEServiceError(
        SSEServiceErrorCode.INVALID_EVENT_NAME,
        "Event name must be a string",
        { event },
      );
    }

    // Validate retry if provided
    if (
      event.retry !== undefined &&
      (typeof event.retry !== "number" || event.retry < 0)
    ) {
      throw new SSEServiceError(
        SSEServiceErrorCode.INVALID_PAYLOAD,
        "Event retry must be a non-negative number",
        { event },
      );
    }

    // Validate data can be serialized
    this.validateSerialization(event.data);
  }

  /**
   * Validate that data can be serialized to JSON
   */
  private validateSerialization(data: any): void {
    try {
      JSON.stringify(data);
    } catch (error) {
      throw new SSEServiceError(
        SSEServiceErrorCode.SERIALIZATION_ERROR,
        `Data cannot be serialized to JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
        { data, originalError: error },
      );
    }
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate correlation ID for tracking
   */
  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get the underlying SSE manager instance
   */
  getManager(): SSEManager {
    return this.manager;
  }
}

/**
 * Default SSE service instance
 */
export const sseService = new SSEService();

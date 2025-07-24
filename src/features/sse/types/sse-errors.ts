/**
 * SSE Error types and enums
 */

/**
 * SSE Error types enum
 */
export enum SSEErrorType {
  CONNECTION_FAILED = "connection_failed",
  CLIENT_NOT_FOUND = "client_not_found",
  CLIENT_DISCONNECTED = "client_disconnected",
  EVENT_SEND_FAILED = "event_send_failed",
  INVALID_EVENT = "invalid_event",
  CONNECTION_TIMEOUT = "connection_timeout",
  HEARTBEAT_FAILED = "heartbeat_failed",
  REDIS_ERROR = "redis_error",
  RATE_LIMIT_EXCEEDED = "rate_limit_exceeded",
  AUTHENTICATION_FAILED = "authentication_failed",
  AUTHORIZATION_FAILED = "authorization_failed",
}

/**
 * SSE Error interface
 */
export interface SSEError {
  type: SSEErrorType;
  message: string;
  code: string;
  details?: Record<string, any>;
  timestamp: Date;
  clientId?: string;
  userId?: string;
}

/**
 * SSE Error class for throwing errors
 */
export class SSEManagerError extends Error {
  public readonly type: SSEErrorType;
  public readonly code: string;
  public readonly details?: Record<string, any>;
  public readonly timestamp: Date;
  public readonly clientId?: string;
  public readonly userId?: string;

  constructor(
    type: SSEErrorType,
    message: string,
    code: string,
    details?: Record<string, any>,
    clientId?: string,
    userId?: string,
  ) {
    super(message);
    this.name = "SSEManagerError";
    this.type = type;
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
    this.clientId = clientId;
    this.userId = userId;
  }

  /**
   * Convert error to SSEError interface
   */
  toSSEError(): SSEError {
    return {
      type: this.type,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      clientId: this.clientId,
      userId: this.userId,
    };
  }
}

/**
 * Error factory functions for common SSE errors
 */
export const createSSEError = {
  connectionFailed: (
    message: string,
    details?: Record<string, any>,
  ): SSEManagerError => {
    return new SSEManagerError(
      SSEErrorType.CONNECTION_FAILED,
      message,
      "SSE_CONNECTION_FAILED",
      details,
    );
  },

  clientNotFound: (clientId: string): SSEManagerError => {
    return new SSEManagerError(
      SSEErrorType.CLIENT_NOT_FOUND,
      `Client with ID ${clientId} not found`,
      "SSE_CLIENT_NOT_FOUND",
      { clientId },
    );
  },

  clientDisconnected: (clientId: string): SSEManagerError => {
    return new SSEManagerError(
      SSEErrorType.CLIENT_DISCONNECTED,
      `Client ${clientId} is disconnected`,
      "SSE_CLIENT_DISCONNECTED",
      { clientId },
    );
  },

  eventSendFailed: (
    eventType: string,
    clientId?: string,
    details?: Record<string, any>,
  ): SSEManagerError => {
    return new SSEManagerError(
      SSEErrorType.EVENT_SEND_FAILED,
      `Failed to send event ${eventType}`,
      "SSE_EVENT_SEND_FAILED",
      { eventType, clientId, ...details },
    );
  },

  invalidEvent: (
    eventType: string,
    details?: Record<string, any>,
  ): SSEManagerError => {
    return new SSEManagerError(
      SSEErrorType.INVALID_EVENT,
      `Invalid event: ${eventType}`,
      "SSE_INVALID_EVENT",
      { eventType, ...details },
    );
  },

  connectionTimeout: (clientId: string): SSEManagerError => {
    return new SSEManagerError(
      SSEErrorType.CONNECTION_TIMEOUT,
      `Connection timeout for client ${clientId}`,
      "SSE_CONNECTION_TIMEOUT",
      { clientId },
    );
  },

  heartbeatFailed: (clientId: string): SSEManagerError => {
    return new SSEManagerError(
      SSEErrorType.HEARTBEAT_FAILED,
      `Heartbeat failed for client ${clientId}`,
      "SSE_HEARTBEAT_FAILED",
      { clientId },
    );
  },

  redisError: (
    message: string,
    details?: Record<string, any>,
  ): SSEManagerError => {
    return new SSEManagerError(
      SSEErrorType.REDIS_ERROR,
      message,
      "SSE_REDIS_ERROR",
      details,
    );
  },

  rateLimitExceeded: (clientId?: string): SSEManagerError => {
    return new SSEManagerError(
      SSEErrorType.RATE_LIMIT_EXCEEDED,
      "Rate limit exceeded",
      "SSE_RATE_LIMIT_EXCEEDED",
      { clientId },
    );
  },

  authenticationFailed: (details?: Record<string, any>): SSEManagerError => {
    return new SSEManagerError(
      SSEErrorType.AUTHENTICATION_FAILED,
      "Authentication failed",
      "SSE_AUTHENTICATION_FAILED",
      details,
    );
  },

  authorizationFailed: (
    userId?: string,
    details?: Record<string, any>,
  ): SSEManagerError => {
    return new SSEManagerError(
      SSEErrorType.AUTHORIZATION_FAILED,
      "Authorization failed",
      "SSE_AUTHORIZATION_FAILED",
      { userId, ...details },
    );
  },
};

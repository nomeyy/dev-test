/**
 * SSE message formatting utilities
 * Handles proper SSE event structure, JSON serialization, and error handling
 */

import type { SSEEvent, EventPayload } from "../types";

/**
 * Configuration for SSE message formatting
 */
export interface SSEFormatterConfig {
  defaultRetryInterval: number;
  maxDataLineLength: number;
  enableEventIdGeneration: boolean;
  enableTimestamps: boolean;
}

/**
 * Default configuration for SSE formatter
 */
export const DEFAULT_FORMATTER_CONFIG: SSEFormatterConfig = {
  defaultRetryInterval: 3000, // 3 seconds
  maxDataLineLength: 8192, // 8KB per line
  enableEventIdGeneration: true,
  enableTimestamps: true,
};

/**
 * Error types for message formatting
 */
export enum SSEFormatterErrorCode {
  SERIALIZATION_ERROR = "SERIALIZATION_ERROR",
  INVALID_EVENT_STRUCTURE = "INVALID_EVENT_STRUCTURE",
  DATA_TOO_LARGE = "DATA_TOO_LARGE",
  INVALID_EVENT_NAME = "INVALID_EVENT_NAME",
  INVALID_RETRY_VALUE = "INVALID_RETRY_VALUE",
}

/**
 * SSE formatter error class
 */
export class SSEFormatterError extends Error {
  constructor(
    public code: SSEFormatterErrorCode,
    message: string,
    public details?: any,
  ) {
    super(message);
    this.name = "SSEFormatterError";
  }
}

/**
 * SSE message formatter class
 */
export class SSEMessageFormatter {
  private config: SSEFormatterConfig;

  constructor(config: Partial<SSEFormatterConfig> = {}) {
    this.config = { ...DEFAULT_FORMATTER_CONFIG, ...config };
  }

  /**
   * Format an SSE event into the proper SSE message format
   */
  formatEvent(event: SSEEvent): string {
    try {
      this.validateEvent(event);

      let formatted = "";

      // Add event ID
      const eventId =
        event.id ||
        (this.config.enableEventIdGeneration
          ? this.generateEventId()
          : undefined);
      if (eventId) {
        formatted += `id: ${this.sanitizeField(eventId)}\n`;
      }

      // Add event name/type
      if (event.event !== undefined) {
        this.validateEventName(event.event);
        formatted += `event: ${this.sanitizeField(event.event)}\n`;
      }

      // Add retry interval
      const retryInterval = event.retry || this.config.defaultRetryInterval;
      if (retryInterval && retryInterval > 0) {
        this.validateRetryValue(retryInterval);
        formatted += `retry: ${retryInterval}\n`;
      }

      // Add data payload
      formatted += this.formatDataField(event.data);

      // Add final newline to signal end of event
      formatted += "\n";

      return formatted;
    } catch (error) {
      if (error instanceof SSEFormatterError) {
        throw error;
      }

      throw new SSEFormatterError(
        SSEFormatterErrorCode.INVALID_EVENT_STRUCTURE,
        `Failed to format SSE event: ${error instanceof Error ? error.message : "Unknown error"}`,
        { event, originalError: error },
      );
    }
  }

  /**
   * Format multiple events into a single SSE message
   */
  formatEvents(events: SSEEvent[]): string {
    if (!Array.isArray(events) || events.length === 0) {
      return "";
    }

    return events.map((event) => this.formatEvent(event)).join("");
  }

  /**
   * Create a formatted heartbeat/ping event
   */
  formatHeartbeat(connectionId?: string): string {
    const heartbeatEvent: SSEEvent = {
      id: this.generateEventId(),
      event: "ping",
      data: {
        type: "heartbeat",
        timestamp: new Date().toISOString(),
        connectionId,
      },
      retry: this.config.defaultRetryInterval,
    };

    return this.formatEvent(heartbeatEvent);
  }

  /**
   * Create a formatted error event
   */
  formatError(error: Error, connectionId?: string): string {
    const errorEvent: SSEEvent = {
      id: this.generateEventId(),
      event: "error",
      data: {
        type: "error",
        timestamp: new Date().toISOString(),
        error: {
          name: error.name,
          message: error.message,
          code: (error as any).code || "UNKNOWN_ERROR",
        },
        connectionId,
      },
      retry: this.config.defaultRetryInterval,
    };

    return this.formatEvent(errorEvent);
  }

  /**
   * Create a formatted connection event
   */
  formatConnectionEvent(
    type: "connected" | "disconnected",
    connectionId: string,
    metadata?: any,
  ): string {
    const connectionEvent: SSEEvent = {
      id: this.generateEventId(),
      event: "connection",
      data: {
        type: `connection_${type}`,
        timestamp: new Date().toISOString(),
        connectionId,
        ...metadata,
      },
      retry: this.config.defaultRetryInterval,
    };

    return this.formatEvent(connectionEvent);
  }

  /**
   * Format the data field with proper SSE multi-line handling
   */
  private formatDataField(data: any): string {
    try {
      // Serialize data to JSON
      const jsonData = this.serializeData(data);

      // Split into lines and format each line
      const lines = jsonData.split("\n");
      let formatted = "";

      for (const line of lines) {
        // Check line length
        if (line.length > this.config.maxDataLineLength) {
          throw new SSEFormatterError(
            SSEFormatterErrorCode.DATA_TOO_LARGE,
            `Data line exceeds maximum length of ${this.config.maxDataLineLength} characters`,
            {
              lineLength: line.length,
              maxLength: this.config.maxDataLineLength,
            },
          );
        }

        formatted += `data: ${line}\n`;
      }

      return formatted;
    } catch (error) {
      if (error instanceof SSEFormatterError) {
        throw error;
      }

      throw new SSEFormatterError(
        SSEFormatterErrorCode.SERIALIZATION_ERROR,
        `Failed to format data field: ${error instanceof Error ? error.message : "Unknown error"}`,
        { data, originalError: error },
      );
    }
  }

  /**
   * Serialize data to JSON with error handling
   */
  private serializeData(data: any): string {
    try {
      // Handle different data types
      if (data === null || data === undefined) {
        return JSON.stringify(null);
      }

      if (typeof data === "string") {
        // If it's already a string, check if it's valid JSON
        try {
          JSON.parse(data);
          return data; // It's already valid JSON
        } catch {
          // It's a plain string, serialize it
          return JSON.stringify(data);
        }
      }

      // For objects, arrays, numbers, booleans
      return JSON.stringify(data, this.jsonReplacer);
    } catch (error) {
      throw new SSEFormatterError(
        SSEFormatterErrorCode.SERIALIZATION_ERROR,
        `Failed to serialize data to JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
        { data, originalError: error },
      );
    }
  }

  /**
   * JSON replacer function to handle special values
   */
  private jsonReplacer(key: string, value: any): any {
    // Handle Date objects
    if (value instanceof Date) {
      return value.toISOString();
    }

    // Handle undefined values
    if (value === undefined) {
      return null;
    }

    // Handle functions (convert to string representation)
    if (typeof value === "function") {
      return `[Function: ${value.name || "anonymous"}]`;
    }

    // Handle circular references and other non-serializable objects
    if (typeof value === "object" && value !== null) {
      try {
        JSON.stringify(value);
        return value;
      } catch {
        return "[Object: non-serializable]";
      }
    }

    return value;
  }

  /**
   * Validate SSE event structure
   */
  private validateEvent(event: SSEEvent): void {
    if (!event || typeof event !== "object") {
      throw new SSEFormatterError(
        SSEFormatterErrorCode.INVALID_EVENT_STRUCTURE,
        "Event must be a valid object",
        { event },
      );
    }

    // Data is required
    if (event.data === undefined) {
      throw new SSEFormatterError(
        SSEFormatterErrorCode.INVALID_EVENT_STRUCTURE,
        "Event data is required",
        { event },
      );
    }

    // Validate optional fields
    if (event.id !== undefined && typeof event.id !== "string") {
      throw new SSEFormatterError(
        SSEFormatterErrorCode.INVALID_EVENT_STRUCTURE,
        "Event ID must be a string",
        { event },
      );
    }

    if (event.event !== undefined && typeof event.event !== "string") {
      throw new SSEFormatterError(
        SSEFormatterErrorCode.INVALID_EVENT_NAME,
        "Event name must be a string",
        { event },
      );
    }

    if (
      event.retry !== undefined &&
      (typeof event.retry !== "number" || event.retry < 0)
    ) {
      throw new SSEFormatterError(
        SSEFormatterErrorCode.INVALID_RETRY_VALUE,
        "Event retry must be a non-negative number",
        { event },
      );
    }
  }

  /**
   * Validate event name
   */
  private validateEventName(eventName: string): void {
    if (
      !eventName ||
      typeof eventName !== "string" ||
      eventName.trim().length === 0
    ) {
      throw new SSEFormatterError(
        SSEFormatterErrorCode.INVALID_EVENT_NAME,
        "Event name cannot be empty",
        { eventName },
      );
    }

    // Check for newlines in event name (not allowed in SSE)
    if (eventName.includes("\n") || eventName.includes("\r")) {
      throw new SSEFormatterError(
        SSEFormatterErrorCode.INVALID_EVENT_NAME,
        "Event name cannot contain newline characters",
        { eventName },
      );
    }
  }

  /**
   * Validate retry value
   */
  private validateRetryValue(retry: number): void {
    if (!Number.isInteger(retry) || retry < 0) {
      throw new SSEFormatterError(
        SSEFormatterErrorCode.INVALID_RETRY_VALUE,
        "Retry value must be a non-negative integer",
        { retry },
      );
    }

    // Reasonable upper limit (5 minutes)
    if (retry > 300000) {
      throw new SSEFormatterError(
        SSEFormatterErrorCode.INVALID_RETRY_VALUE,
        "Retry value cannot exceed 300000ms (5 minutes)",
        { retry },
      );
    }
  }

  /**
   * Sanitize field values to prevent SSE injection
   */
  private sanitizeField(value: string): string {
    // Remove or replace characters that could break SSE format
    return value
      .replace(/\r\n/g, " ")
      .replace(/\r/g, " ")
      .replace(/\n/g, " ")
      .trim();
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `evt_${timestamp}_${random}`;
  }

  /**
   * Update formatter configuration
   */
  updateConfig(config: Partial<SSEFormatterConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current formatter configuration
   */
  getConfig(): SSEFormatterConfig {
    return { ...this.config };
  }
}

/**
 * Default SSE message formatter instance
 */
export const sseFormatter = new SSEMessageFormatter();

/**
 * Utility functions for common SSE formatting tasks
 */
export const SSEFormatUtils = {
  /**
   * Create a simple notification event
   */
  createNotification(
    message: string,
    type: string = "notification",
    metadata?: any,
  ): SSEEvent {
    return {
      event: type,
      data: {
        type,
        timestamp: new Date().toISOString(),
        message,
        ...metadata,
      },
    };
  },

  /**
   * Create a data update event
   */
  createDataUpdate(data: any, entityType: string, entityId?: string): SSEEvent {
    return {
      event: "data_update",
      data: {
        type: "data_update",
        timestamp: new Date().toISOString(),
        entityType,
        entityId,
        data,
      },
    };
  },

  /**
   * Create a status change event
   */
  createStatusChange(
    status: string,
    entityType: string,
    entityId: string,
    metadata?: any,
  ): SSEEvent {
    return {
      event: "status_change",
      data: {
        type: "status_change",
        timestamp: new Date().toISOString(),
        entityType,
        entityId,
        status,
        ...metadata,
      },
    };
  },

  /**
   * Create a custom event with proper structure
   */
  createCustomEvent(
    eventName: string,
    payload: any,
    eventId?: string,
  ): SSEEvent {
    return {
      id: eventId,
      event: eventName,
      data: {
        type: eventName,
        timestamp: new Date().toISOString(),
        data: payload,
      },
    };
  },
};

import { createServiceContext } from "@/utils/service-utils";
import type { SSEEvent } from "../types";
import { SSEEventModel, SSE_EVENT_TYPES } from "../types";
import { sseManager } from "./sse-manager";

const { log, handleError } = createServiceContext("SSEEventDispatcher");

export class SSEEventDispatcher {
  sendToUser(
    userId: string,
    event: Omit<SSEEvent, "targetUserId" | "timestamp">,
  ): boolean {
    try {
      const fullEvent: SSEEvent = {
        ...event,
        targetUserId: userId,
        timestamp: Date.now(),
      };

      SSEEventModel.parse(fullEvent);

      const userConnections = sseManager.getUserConnections(userId);

      if (userConnections.length === 0) {
        log.debug("No active connections for user", {
          userId,
          eventType: event.type,
        });
        return false;
      }

      log.info("Sending SSE event to user", {
        userId,
        eventType: event.type,
        connectionCount: userConnections.length,
      });

      let sentCount = 0;
      userConnections.forEach((connection) => {
        const success = sseManager.sendEventToConnection(
          connection.id,
          fullEvent,
        );
        if (success) {
          sentCount++;
          log.debug("Event sent to connection", {
            connectionId: connection.id,
            event: fullEvent,
          });
        } else {
          log.warn("Failed to send event to connection", {
            connectionId: connection.id,
            event: fullEvent,
          });
        }
      });

      log.info("SSE event sent to user", {
        userId,
        eventType: event.type,
        sentCount,
        totalConnections: userConnections.length,
      });

      return true;
    } catch (error) {
      handleError("sending SSE event to user", error);
      return false;
    }
  }

  broadcast(event: Omit<SSEEvent, "timestamp">): boolean {
    try {
      const fullEvent: SSEEvent = {
        ...event,
        timestamp: Date.now(),
      };

      SSEEventModel.parse(fullEvent);

      const allConnections = sseManager.getAllConnections();

      if (allConnections.length === 0) {
        log.debug("No active connections for broadcast", {
          eventType: event.type,
        });
        return false;
      }

      log.info("Broadcasting SSE event", {
        eventType: event.type,
        connectionCount: allConnections.length,
      });

      let sentCount = 0;
      allConnections.forEach((connection) => {
        const success = sseManager.sendEventToConnection(
          connection.id,
          fullEvent,
        );
        if (success) {
          sentCount++;
          log.debug("Event broadcast to connection", {
            connectionId: connection.id,
            event: fullEvent,
          });
        } else {
          log.warn("Failed to broadcast event to connection", {
            connectionId: connection.id,
            event: fullEvent,
          });
        }
      });

      log.info("SSE event broadcast", {
        eventType: event.type,
        sentCount,
        totalConnections: allConnections.length,
      });

      return true;
    } catch (error) {
      handleError("broadcasting SSE event", error);
      return false;
    }
  }

  sendUploadProgress(
    userId: string,
    progress: number,
    uploadId: string,
  ): boolean {
    return this.sendToUser(userId, {
      type: SSE_EVENT_TYPES.UPLOAD_PROGRESS,
      data: { progress, uploadId },
    });
  }

  sendUploadComplete(
    userId: string,
    uploadId: string,
    playbackId?: string,
  ): boolean {
    return this.sendToUser(userId, {
      type: SSE_EVENT_TYPES.UPLOAD_COMPLETE,
      data: { uploadId, playbackId },
    });
  }

  sendUploadError(userId: string, uploadId: string, error: string): boolean {
    return this.sendToUser(userId, {
      type: SSE_EVENT_TYPES.UPLOAD_ERROR,
      data: { uploadId, error },
    });
  }

  sendProcessingStarted(userId: string, uploadId: string): boolean {
    return this.sendToUser(userId, {
      type: SSE_EVENT_TYPES.PROCESSING_STARTED,
      data: { uploadId },
    });
  }

  sendProcessingComplete(
    userId: string,
    uploadId: string,
    playbackId: string,
  ): boolean {
    return this.sendToUser(userId, {
      type: SSE_EVENT_TYPES.PROCESSING_COMPLETE,
      data: { uploadId, playbackId },
    });
  }

  sendProcessingError(
    userId: string,
    uploadId: string,
    error: string,
  ): boolean {
    return this.sendToUser(userId, {
      type: SSE_EVENT_TYPES.PROCESSING_ERROR,
      data: { uploadId, error },
    });
  }

  sendUserNotification(
    userId: string,
    message: string,
    type: "info" | "success" | "warning" | "error" = "info",
  ): boolean {
    return this.sendToUser(userId, {
      type: SSE_EVENT_TYPES.USER_NOTIFICATION,
      data: { message, type },
    });
  }

  sendHeartbeat(): boolean {
    return this.broadcast({
      type: SSE_EVENT_TYPES.HEARTBEAT,
      data: { timestamp: Date.now() },
    });
  }

  getStats() {
    const managerStats = sseManager.getStats();
    return {
      ...managerStats,
      dispatcher: "SSE Event Dispatcher",
    };
  }
}

export const sseEventDispatcher = new SSEEventDispatcher();

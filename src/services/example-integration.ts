import { SSEManager } from "@/features/sse";
import { logger } from "@/utils/logging";

/**
 * Example service demonstrating how to integrate SSE with backend operations.
 * This service simulates various real-world scenarios like job processing,
 * webhook handling, and system notifications.
 */
export class ExampleIntegrationService {
  private sseManager: SSEManager;

  constructor() {
    this.sseManager = SSEManager.getInstance();
  }

  /**
   * Simulate processing a background job with progress updates
   */
  async processJob(jobId: string, userId: string): Promise<void> {
    logger.info("EXAMPLE_SERVICE", `Starting job ${jobId} for user ${userId}`);

    // Notify job start
    await this.sseManager.sendToUser(userId, {
      event: "job_started",
      data: {
        jobId,
        status: "started",
        timestamp: new Date().toISOString(),
      },
    });

    // Simulate job progress with updates
    const progressSteps = [10, 30, 50, 75, 90, 100];

    for (const progress of progressSteps) {
      // Simulate work being done
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Send progress update
      await this.sseManager.sendToUser(userId, {
        event: "job_progress",
        data: {
          jobId,
          status: "processing",
          progress,
          timestamp: new Date().toISOString(),
        },
      });

      logger.info("EXAMPLE_SERVICE", `Job ${jobId} progress: ${progress}%`);
    }

    // Job completed
    await this.sseManager.sendToUser(userId, {
      event: "job_completed",
      data: {
        jobId,
        status: "completed",
        result: "Job finished successfully!",
        timestamp: new Date().toISOString(),
      },
    });

    logger.info("EXAMPLE_SERVICE", `Job ${jobId} completed for user ${userId}`);
  }

  /**
   * Simulate handling a webhook that affects multiple users
   */
  async handleWebhook(
    webhookType: string,
    affectedUserIds: string[],
  ): Promise<void> {
    logger.info("EXAMPLE_SERVICE", `Processing webhook: ${webhookType}`, {
      affectedUserIds,
    });

    // Send individual notifications to affected users
    for (const userId of affectedUserIds) {
      await this.sseManager.sendToUser(userId, {
        event: "webhook_notification",
        data: {
          type: webhookType,
          message: `You have been affected by a ${webhookType} event`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Broadcast system-wide notification if it's a critical webhook
    if (
      webhookType === "system_maintenance" ||
      webhookType === "security_update"
    ) {
      await this.sseManager.broadcastToAll({
        event: "system_announcement",
        data: {
          type: webhookType,
          message: `System announcement: ${webhookType} is in progress`,
          priority: "high",
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Send real-time notifications to users
   */
  async sendNotification(
    userId: string,
    message: string,
    type: "info" | "success" | "warning" | "error" = "info",
  ): Promise<void> {
    await this.sseManager.notifyUser(userId, message, type);
    logger.info(
      "EXAMPLE_SERVICE",
      `Sent ${type} notification to user ${userId}: ${message}`,
    );
  }

  /**
   * Broadcast system-wide announcements
   */
  async broadcastAnnouncement(
    message: string,
    priority: "low" | "medium" | "high" = "medium",
  ): Promise<void> {
    const clientCount = await this.sseManager.announce(message, priority);
    logger.info(
      "EXAMPLE_SERVICE",
      `Broadcasted announcement to ${clientCount} clients: ${message}`,
    );
  }

  /**
   * Send real-time data updates
   */
  async sendDataUpdate(
    userId: string,
    dataType: string,
    data: unknown,
  ): Promise<void> {
    await this.sseManager.sendToUser(userId, {
      event: "data_update",
      data: {
        type: dataType,
        payload: data,
        timestamp: new Date().toISOString(),
      },
    });

    logger.info("EXAMPLE_SERVICE", `Sent data update to user ${userId}`, {
      dataType,
    });
  }

  /**
   * Get SSE service statistics
   */
  async getServiceStats(): Promise<{
    totalClients: number;
    clientsByUser: Record<string, number>;
  }> {
    return this.sseManager.getStats();
  }
}

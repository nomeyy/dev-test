/**
 * Example: SSE Integration with Webhook Handlers
 *
 * This file demonstrates how to integrate the SSE manager with various backend processes
 * like webhook handlers, job processors, and other real-time notification scenarios.
 */

import {
  sendNotification,
  sendToUser,
  broadcast,
  sendSystemUpdate,
} from "@/features/sse";

// Example 1: Payment Webhook Handler
export async function handlePaymentWebhook(paymentData: {
  userId: string;
  amount: number;
  status: "success" | "failed";
  transactionId: string;
}) {
  try {
    // Process the payment
    console.log("Processing payment:", paymentData);

    if (paymentData.status === "success") {
      // Send real-time notification to user
      await sendNotification(
        paymentData.userId,
        "Payment Successful",
        `Your payment of $${paymentData.amount} has been processed successfully. Transaction ID: ${paymentData.transactionId}`,
        "success",
      );
    } else {
      // Send error notification
      await sendNotification(
        paymentData.userId,
        "Payment Failed",
        `Your payment of $${paymentData.amount} could not be processed. Please try again.`,
        "error",
      );
    }
  } catch (error) {
    console.error("Error processing payment webhook:", error);
  }
}

// Example 2: User Activity Tracking
export async function trackUserActivity(
  userId: string,
  activity: {
    type: "page_view" | "login" | "logout" | "action";
    page?: string;
    action?: string;
  },
) {
  try {
    // Send activity event to user's connected clients
    await sendToUser(userId, "user_activity", {
      userId,
      activity,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Error tracking user activity:", error);
  }
}

// Example 3: System Maintenance Notifications
export async function notifySystemMaintenance(maintenance: {
  startTime: string;
  duration: string;
  reason: string;
}) {
  try {
    // Send system update to all connected clients
    await sendSystemUpdate("Scheduled Maintenance", {
      startTime: maintenance.startTime,
      duration: maintenance.duration,
      reason: maintenance.reason,
      type: "maintenance",
    });
  } catch (error) {
    console.error("Error sending maintenance notification:", error);
  }
}

// Example 4: Batch Job Progress
export async function updateBatchJobProgress(
  jobId: string,
  progress: {
    current: number;
    total: number;
    status: "running" | "completed" | "failed";
    message?: string;
  },
) {
  try {
    const percentage = Math.round((progress.current / progress.total) * 100);

    // Broadcast job progress to all clients
    await broadcast("job_progress", {
      jobId,
      progress: {
        ...progress,
        percentage,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Error updating job progress:", error);
  }
}

// Example 5: Real-time Chat Notifications
export async function sendChatNotification(
  userId: string,
  chatData: {
    senderId: string;
    senderName: string;
    message: string;
    roomId: string;
  },
) {
  try {
    await sendNotification(
      userId,
      `New message from ${chatData.senderName}`,
      chatData.message,
      "info",
    );
  } catch (error) {
    console.error("Error sending chat notification:", error);
  }
}

// Example 6: File Upload Progress
export async function updateUploadProgress(
  userId: string,
  uploadData: {
    fileId: string;
    fileName: string;
    progress: number;
    status: "uploading" | "processing" | "completed" | "failed";
  },
) {
  try {
    await sendToUser(userId, "upload_progress", {
      ...uploadData,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Error updating upload progress:", error);
  }
}

// Example 7: Error Notifications
export async function sendErrorNotification(
  userId: string,
  error: {
    code: string;
    message: string;
    details?: any;
  },
) {
  try {
    await sendNotification(
      userId,
      "System Error",
      `An error occurred: ${error.message}`,
      "error",
    );
  } catch (error) {
    console.error("Error sending error notification:", error);
  }
}

// Example 8: Custom Event Broadcasting
export async function broadcastCustomEvent(eventName: string, data: any) {
  try {
    await broadcast(eventName, {
      ...data,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Error broadcasting custom event:", error);
  }
}

// Example 9: User-specific Custom Events
export async function sendCustomEventToUser(
  userId: string,
  eventName: string,
  data: any,
) {
  try {
    await sendToUser(userId, eventName, {
      ...data,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Error sending custom event to user:", error);
  }
}

// Example 10: Integration with Database Triggers
export async function handleDatabaseChange(change: {
  table: string;
  operation: "insert" | "update" | "delete";
  recordId: string;
  userId?: string;
  data?: any;
}) {
  try {
    if (change.userId) {
      // Send to specific user
      await sendToUser(change.userId, "data_change", {
        table: change.table,
        operation: change.operation,
        recordId: change.recordId,
        data: change.data,
      });
    } else {
      // Broadcast to all clients
      await broadcast("data_change", {
        table: change.table,
        operation: change.operation,
        recordId: change.recordId,
        data: change.data,
      });
    }
  } catch (error) {
    console.error("Error handling database change:", error);
  }
}

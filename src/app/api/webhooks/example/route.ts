/**
 * Example Webhook Handler
 *
 * This demonstrates how to integrate the SSE service with webhook handlers
 * to send real-time notifications to clients.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  sendPaymentNotification,
  sendUserAccountNotification,
  sendSystemHealthNotification,
  sendJobNotification,
  sendRealtimeUpdate,
} from "@/lib/sse/backend-api";
import { logger } from "@/utils/logging";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { webhookType, data } = body;

    logger.info("Webhook", "Received webhook", { webhookType, data });

    let notificationResult: boolean | number = false;

    switch (webhookType) {
      case "payment.completed":
        notificationResult = sendPaymentNotification(
          data.paymentId,
          "completed",
          {
            amount: data.amount,
            currency: data.currency,
            customerId: data.customerId,
            orderId: data.orderId,
          },
          "user",
          data.customerId,
        );
        break;

      case "payment.failed":
        notificationResult = sendPaymentNotification(
          data.paymentId,
          "failed",
          {
            amount: data.amount,
            currency: data.currency,
            customerId: data.customerId,
            orderId: data.orderId,
            error: data.error,
          },
          "user",
          data.customerId,
        );
        break;

      case "user.created":
        notificationResult = sendUserAccountNotification(
          data.userId,
          "created",
          {
            email: data.email,
            username: data.username,
          },
          "user",
          data.userId,
        );
        break;

      case "user.suspended":
        notificationResult = sendUserAccountNotification(
          data.userId,
          "suspended",
          {
            email: data.email,
            username: data.username,
            reason: data.reason,
          },
          "user",
          data.userId,
        );
        break;

      case "system.health":
        notificationResult = sendSystemHealthNotification(
          data.component,
          data.status,
          {
            message: data.message,
            metrics: data.metrics,
          },
          "channel",
          "system-monitoring",
        );
        break;

      case "job.completed":
        notificationResult = sendJobNotification(
          data.jobId,
          "completed",
          {
            jobType: data.jobType,
            result: data.result,
            metadata: data.metadata,
          },
          "user",
          data.userId,
        );
        break;

      case "content.created":
        notificationResult = sendRealtimeUpdate(
          "post",
          data.postId,
          "created",
          {
            title: data.title,
            author: data.author,
            category: data.category,
          },
          "channel",
          "content-updates",
        );
        break;

      default:
        logger.warn("Webhook", "Unknown webhook type", { webhookType });
        return NextResponse.json(
          { error: "Unknown webhook type" },
          { status: 400 },
        );
    }

    logger.info("Webhook", "Notification sent", {
      webhookType,
      result: notificationResult,
    });

    return NextResponse.json({
      success: true,
      notificationSent: notificationResult,
      webhookType,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Webhook", "Failed to process webhook", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Example GET endpoint to test SSE notifications
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const testType = searchParams.get("type");
  const userId = searchParams.get("userId");
  const channel = searchParams.get("channel");

  try {
    let result: boolean | number = false;

    switch (testType) {
      case "payment":
        if (!userId) {
          return NextResponse.json(
            { error: "userId required for payment test" },
            { status: 400 },
          );
        }
        result = sendPaymentNotification(
          "test-payment-123",
          "completed",
          {
            amount: 99.99,
            currency: "USD",
            customerId: userId,
            orderId: "test-order-123",
          },
          "user",
          userId,
        );
        break;

      case "system":
        result = sendSystemHealthNotification(
          "database",
          "warning",
          {
            message: "High memory usage detected",
            metrics: { memoryUsage: "85%", cpuUsage: "60%" },
          },
          "channel",
          channel || "system-monitoring",
        );
        break;

      case "content":
        result = sendRealtimeUpdate(
          "post",
          "test-post-123",
          "created",
          {
            title: "Test Blog Post",
            author: "Test User",
            category: "Technology",
          },
          "channel",
          channel || "content-updates",
        );
        break;

      case "job":
        if (!userId) {
          return NextResponse.json(
            { error: "userId required for job test" },
            { status: 400 },
          );
        }
        result = sendJobNotification(
          "test-job-123",
          "completed",
          {
            jobType: "video-processing",
            result: "success",
            metadata: { duration: "2:30", quality: "1080p" },
          },
          "user",
          userId,
        );
        break;

      default:
        return NextResponse.json(
          {
            error: "Invalid test type. Use: payment, system, content, or job",
            examples: {
              payment: "/api/webhooks/example?type=payment&userId=user123",
              system: "/api/webhooks/example?type=system&channel=monitoring",
              content: "/api/webhooks/example?type=content&channel=updates",
              job: "/api/webhooks/example?type=job&userId=user123",
            },
          },
          { status: 400 },
        );
    }

    return NextResponse.json({
      success: true,
      testType,
      result,
      message: `Test ${testType} notification sent successfully`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Webhook", "Failed to send test notification", {
      error,
      testType,
    });
    return NextResponse.json(
      { error: "Failed to send test notification" },
      { status: 500 },
    );
  }
}

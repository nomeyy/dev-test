import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * SSE Test API endpoint for demonstrating real-time messaging capabilities
 *
 * This endpoint provides comprehensive testing functionality for the SSE system,
 * supporting various event types commonly used in real-time applications.
 *
 * Supported test event types:
 * - notification: System notifications with title, message, and type
 * - system_message: Administrative messages with severity levels
 * - data_sync: Data synchronization events with random payloads
 * - user_update: User profile update notifications
 * - channel_message: Channel-based messaging
 * - custom: Custom events with flexible data structures
 * - job_progress: Multi-step progress tracking with incremental updates
 * - analytics: Real-time analytics updates with mock metrics
 * - heartbeat: Manual heartbeat trigger for connection testing
 *
 * @param request - HTTP request containing event type and parameters
 * @returns JSON response with event delivery status
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = (await request.json()) as {
      type: string;
      target?: string;
      channel?: string;
      userId?: string;
      data?: unknown;
    };

    // Validate required fields
    if (!body.type || typeof body.type !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid event type" },
        { status: 400 },
      );
    }
    const { type, target, channel, userId, data } = body;

    // Access global SSE controller for direct message sending
    const controller = (global as Record<string, unknown>).sseController as
      | ReadableStreamDefaultController<Uint8Array>
      | undefined;
    const encoder = (global as Record<string, unknown>).sseEncoder as
      | TextEncoder
      | undefined;

    // Ensure active SSE connection exists
    if (!controller || !encoder) {
      return NextResponse.json(
        {
          error:
            "No active SSE connection available. Please establish an SSE connection first.",
        },
        { status: 400 },
      );
    }

    const result = 1; // Always 1 for simple implementation

    switch (type) {
      case "notification":
        const notificationMessage = [
          `id: ${crypto.randomUUID()}`,
          `event: system_notification`,
          `data: ${JSON.stringify({
            title: "Test Notification",
            message:
              "This is a test notification sent via the SSE test interface",
            type: "info",
            timestamp: new Date().toISOString(),
          })}`,
          "",
          "",
        ].join("\n");

        controller.enqueue(encoder.encode(notificationMessage));
        break;

      case "system_message":
        const systemMessage = [
          `id: ${crypto.randomUUID()}`,
          `event: system_message`,
          `data: ${JSON.stringify({
            message: "System test message from SSE test interface",
            level: "info",
            timestamp: new Date().toISOString(),
          })}`,
          "",
          "",
        ].join("\n");

        controller.enqueue(encoder.encode(systemMessage));
        break;

      case "data_sync":
        const dataSyncMessage = [
          `id: ${crypto.randomUUID()}`,
          `event: data_sync`,
          `data: ${JSON.stringify({
            message: "Test data sync event",
            timestamp: new Date().toISOString(),
            random: Math.random(),
          })}`,
          "",
          "",
        ].join("\n");

        controller.enqueue(encoder.encode(dataSyncMessage));
        break;

      case "user_update":
        const userUpdateMessage = [
          `id: ${crypto.randomUUID()}`,
          `event: user_update`,
          `data: ${JSON.stringify({
            updateType: "profile_test",
            message: "Test user update event",
            fields: ["name", "avatar"],
            timestamp: new Date().toISOString(),
          })}`,
          "",
          "",
        ].join("\n");

        controller.enqueue(encoder.encode(userUpdateMessage));
        break;

      case "channel_message":
        if (channel) {
          const channelMessage = [
            `id: ${crypto.randomUUID()}`,
            `event: channel_message`,
            `data: ${JSON.stringify({
              channel,
              message: `Test message sent to ${channel} channel`,
              timestamp: new Date().toISOString(),
              sender: "test-interface",
            })}`,
            "",
            "",
          ].join("\n");

          controller.enqueue(encoder.encode(channelMessage));
        }
        break;

      case "custom":
        const customMessage = [
          `id: ${crypto.randomUUID()}`,
          `event: custom_test_event`,
          `data: ${JSON.stringify({
            message: "This is a custom test event",
            timestamp: new Date().toISOString(),
            customData: data ?? { test: true },
            target: target ?? "broadcast",
            channel: channel ?? userId,
          })}`,
          "",
          "",
        ].join("\n");

        controller.enqueue(encoder.encode(customMessage));
        break;

      case "job_progress":
        const jobId = `test-job-${Date.now()}`;
        // Send multiple progress updates
        for (let i = 0; i <= 100; i += 25) {
          await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay

          const jobProgressMessage = [
            `id: ${crypto.randomUUID()}`,
            `event: job_progress`,
            `data: ${JSON.stringify({
              jobId,
              progress: i,
              message: `Processing step ${i / 25 + 1} of 5`,
              timestamp: new Date().toISOString(),
              userId: userId ?? "test-user",
            })}`,
            "",
            "",
          ].join("\n");

          controller.enqueue(encoder.encode(jobProgressMessage));
        }
        break;

      case "analytics":
        const analyticsMessage = [
          `id: ${crypto.randomUUID()}`,
          `event: analytics_update`,
          `data: ${JSON.stringify({
            channel: "analytics",
            metrics: {
              activeUsers: Math.floor(Math.random() * 1000),
              pageViews: Math.floor(Math.random() * 10000),
              conversionRate: (Math.random() * 10).toFixed(2) + "%",
            },
            timestamp: new Date().toISOString(),
          })}`,
          "",
          "",
        ].join("\n");

        controller.enqueue(encoder.encode(analyticsMessage));
        break;

      case "heartbeat":
        // Manually trigger heartbeat
        const heartbeatMessage = [
          `id: ${crypto.randomUUID()}`,
          `event: ping`,
          `data: ${JSON.stringify({
            message: "Manual heartbeat triggered from test interface",
            timestamp: new Date().toISOString(),
            manual: true,
          })}`,
          "",
          "",
        ].join("\n");

        controller.enqueue(encoder.encode(heartbeatMessage));
        break;

      default:
        return NextResponse.json(
          { error: "Unknown test event type" },
          { status: 400 },
        );
    }

    return NextResponse.json({
      success: true,
      type,
      target: target ?? "default",
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to send test event",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * GET endpoint to retrieve SSE service status and metrics
 */
export async function GET() {
  try {
    // Check if there's an active SSE connection via global controller
    const hasActiveConnection =
      !!(global as Record<string, unknown>).sseController &&
      !!(global as Record<string, unknown>).sseEncoder;

    return NextResponse.json({
      status: {
        isRunning: hasActiveConnection,
        hasGlobalController: hasActiveConnection,
        implementation: "simplified-direct-streaming",
      },
      metrics: {
        activeConnections: hasActiveConnection ? 1 : 0,
        totalConnections: hasActiveConnection ? 1 : 0,
        connectionsByUser: {},
        averageConnectionDuration: 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to get SSE status",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

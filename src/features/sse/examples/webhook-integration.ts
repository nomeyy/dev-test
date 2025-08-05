/**
 * Example: Webhook Integration with SSE
 * ------------------------------------
 * This example shows how to integrate SSE notifications with webhook handlers
 */

import { type NextRequest, NextResponse } from "next/server";
import { notifyUsers, broadcastUpdate, SSEHelpers } from "@/features/sse";

/**
 * Example webhook handler that sends SSE notifications
 */
export async function handleWebhook(
  request: NextRequest,
): Promise<NextResponse> {
  try {
    const payload = await request.json();

    // Example: Payment webhook
    if (payload.type === "payment.completed") {
      // Notify specific user about payment completion
      await SSEHelpers.notifySuccess(
        payload.userId,
        "Payment Successful",
        `Your payment of $${payload.amount} has been processed successfully.`,
      );

      // Broadcast update about new revenue (for admin dashboard)
      await broadcastUpdate({
        resource: "revenue",
        action: "updated",
        data: { amount: payload.amount, userId: payload.userId },
        timestamp: new Date().toISOString(),
      });
    }

    // Example: User registration webhook
    else if (payload.type === "user.registered") {
      // Send welcome notification to new user
      await notifyUsers([payload.userId], {
        title: "Welcome!",
        message:
          "Welcome to our platform! Get started by exploring your dashboard.",
        type: "success",
        actions: [
          { label: "Go to Dashboard", action: "/dashboard" },
          { label: "View Tutorial", action: "/tutorial" },
        ],
      });

      // Notify admins about new user registration
      const adminIds = await getAdminUserIds(); // Your implementation
      await notifyUsers(adminIds, {
        title: "New User Registration",
        message: `New user ${payload.user.email} has registered.`,
        type: "info",
      });
    }

    // Example: System maintenance webhook
    else if (payload.type === "system.maintenance") {
      // Broadcast system maintenance notification to all users
      await SSEHelpers.systemBroadcast(
        `System maintenance scheduled for ${payload.scheduledTime}. Expected downtime: ${payload.duration}.`,
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook SSE notification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Mock function - implement according to your user management system
async function getAdminUserIds(): Promise<string[]> {
  // Return array of admin user IDs
  return ["admin1", "admin2"];
}

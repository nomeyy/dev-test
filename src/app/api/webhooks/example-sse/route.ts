import { type NextRequest } from "next/server";
import { WebhookHelpers } from "@/lib/sse-utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Example: Handle payment webhook
    if (body.event === "payment.succeeded") {
      WebhookHelpers.handlePaymentSuccess({
        userId: body.data.customer_id,
        amount: body.data.amount,
        id: body.data.id,
      });
    }

    // Example: Handle order update webhook
    if (body.event === "order.updated") {
      WebhookHelpers.handleOrderUpdate({
        userId: body.data.user_id,
        id: body.data.id,
        status: body.data.status,
        updatedAt: new Date().toISOString(),
      });
    }

    // Example: Handle system maintenance webhook
    if (body.event === "maintenance.scheduled") {
      WebhookHelpers.handleMaintenanceAlert({
        minutesUntil: body.data.minutes_until,
        duration: body.data.duration,
      });
    }

    return new Response("Webhook processed successfully", { status: 200 });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return new Response("Webhook processing failed", { status: 500 });
  }
}

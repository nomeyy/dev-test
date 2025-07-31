import { sendSSEToUser } from "@/server/sse/send-event";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, message } = body;

    if (!userId || !message) {
      console.warn("⚠️ Missing userId or message in request");
      return new Response("Invalid request", { status: 400 });
    }

    sendSSEToUser(userId, "user_event", { message });
    return new Response("✅ Message sent to user", { status: 200 });
  } catch (err) {
    console.error("❌ Failed to send message to user", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}

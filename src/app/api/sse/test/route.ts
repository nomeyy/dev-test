import { NextRequest } from "next/server";
import { notifyUser } from "@/features/sse";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const { userId, message } = await request.json();
    notifyUser(userId, {
      event: "notification",
      data: { message, timestamp: new Date().toISOString() },
    });
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response("Internal Server Error", { status: 500 });
  }
}

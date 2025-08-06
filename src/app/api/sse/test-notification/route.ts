import { type NextRequest } from "next/server";
import { auth } from "@/features/auth/handlers";
import { sseUtils } from "@/lib/sse/server";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = (await request.json()) as {
      title: string;
      message: string;
      type?: "info" | "success" | "warning" | "error";
    };
    const { title, message, type = "info" } = body;

    if (!title || !message) {
      return new Response("Missing title or message", { status: 400 });
    }

    // Send notification to the current user
    const sentCount = sseUtils.sendNotification(userId, title, message, type);

    return new Response(
      JSON.stringify({
        success: true,
        sentCount,
        message: "Notification sent successfully",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("Error sending test notification:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

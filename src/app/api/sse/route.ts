import { NextRequest } from "next/server";
import { getEventService } from "@/features/sse";
import { logger } from "@/utils/logging";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const { searchParams } = request.nextUrl;
    const userId = searchParams.get("userId") || undefined;
    const sessionId = searchParams.get("sessionId") || undefined;
    const metadata: Record<string, string> = {};
    for (const [key, value] of searchParams.entries()) {
      if (key !== "userId" && key !== "sessionId") metadata[key] = value;
    }

    const service = getEventService();
    const response = service.createConnection({ userId, sessionId, metadata });
    logger.info("SSE", "New connection", { userId, sessionId });
    return response;
  } catch (error) {
    logger.error("SSE", "Connection failed", error);
    return new Response("Internal Server Error", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

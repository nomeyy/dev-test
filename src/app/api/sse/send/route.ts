import { NextRequest } from "next/server";
import { sseManager } from "@/features/sse";
import { logger } from "@/features/shared/logger";
import { z } from "zod";

const SendEventSchema = z.object({
  type: z.string(),
  data: z.unknown(),
  targetClientId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, data, targetClientId } = SendEventSchema.parse(body);

    if (targetClientId) {
      logger.info("Sending event to specific client", { type, targetClientId });
      sseManager.sendToClient(targetClientId, "custom_message", data);
    } else {
      logger.info("Broadcasting event", { type });
      sseManager.broadcast("custom_message", data);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error("Error sending SSE event", { error });
    return new Response(JSON.stringify({ error: "Failed to send event" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}

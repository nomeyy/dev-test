import { getSession } from "@/features/auth";
import { SseService } from "@/lib/sse/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSseEvent } from "@/lib/sse/events";

const broadcastSchema = z.object({
  channelIds: z
    .array(z.string())
    .min(1, "At least one channel ID is required."),
  message: z.string().min(1, "Message cannot be empty."),
});

export async function POST(req: NextRequest) {
  const session = await getSession();

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = await req.json();
  const parseResult = broadcastSchema.safeParse(body);

  if (!parseResult.success) {
    return new NextResponse(parseResult.error.message, { status: 400 });
  }

  const { channelIds, message } = parseResult.data;

  const event = createSseEvent("message", {
    message,
    timestamp: new Date().toISOString(),
  });

  SseService.broadcast(channelIds, event);

  return NextResponse.json({
    success: true,
    message: `Broadcast sent to ${channelIds.length} channels.`,
  });
}

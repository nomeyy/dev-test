import {
  type SSEBroadcastOptions,
  type SSEEvent,
  sseService,
} from "@/features/sse";
import { userService } from "@/features/users";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const broadcastEventSchema = z.object({
  type: z.string(),
  eventName: z.string().optional(),
  data: z.any(),
});

const broadcastOptionsSchema = z.object({
  userIds: z.array(z.string()).optional(),
  excludeConnectionIds: z.array(z.string()).optional(),
  eventNames: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { event: unknown; options: unknown };
    const usersIds = await userService.getAllUsersIds();
    const validatedEventData = broadcastEventSchema.parse(body.event);
    const validatedOptionsData = broadcastOptionsSchema.parse(body.options);

    const event: SSEEvent = {
      type: validatedEventData.type,
      data: validatedEventData.data as Record<string, unknown>,
      eventName: validatedEventData.eventName,
    };

    const options: SSEBroadcastOptions = {
      userIds: validatedOptionsData.userIds ?? usersIds,
      excludeConnectionIds: validatedOptionsData.excludeConnectionIds,
      eventNames: validatedOptionsData.eventNames,
    };

    await sseService.broadcast(event, options);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("SSE broadcast error:", error);
    return NextResponse.json(
      { error: "Failed to broadcast event" },
      { status: 500 },
    );
  }
}

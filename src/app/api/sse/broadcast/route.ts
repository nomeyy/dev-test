import { userService } from "@/features/users";
import { type SSEBroadcastOptions, type SSEEvent, sseService } from "@/lib/sse";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const broadcastSchema = z.object({
  type: z.string(),
  name: z.string().optional(), // Named event identifier
  data: z.any(),
  userIds: z.array(z.string()).optional(),
  excludeConnectionIds: z.array(z.string()).optional(),
  eventName: z.string().optional(), // Filter by event name
});

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const usersIds = await userService.getAllUsersIds();
    const validatedData = broadcastSchema.parse(body);

    const event: SSEEvent = {
      type: validatedData.type,
      name: validatedData.name,
      data: validatedData.data as Record<string, unknown>,
    };

    const options: SSEBroadcastOptions = {
      userIds: validatedData.userIds ?? usersIds,
      excludeConnectionIds: validatedData.excludeConnectionIds,
      eventName: validatedData.eventName,
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

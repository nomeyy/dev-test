import { sseService } from "@/features/sse";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const sendEventSchema = z.object({
  eventName: z.string(),
  data: z.record(z.unknown()),
});

const sendOptionsSchema = z.object({
  connectionIds: z.array(z.string()).optional(),
  userIds: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { event: unknown; options: unknown };
    const validatedEventData = sendEventSchema.parse(body.event);
    const validatedOptionsData = sendOptionsSchema.parse(body.options);

    // Validate that either connectionIds or userIds is provided
    if (
      !validatedOptionsData.connectionIds?.length &&
      !validatedOptionsData.userIds?.length
    ) {
      return NextResponse.json(
        { error: "Either connectionIds or userIds must be provided" },
        { status: 400 },
      );
    }

    if (validatedOptionsData.connectionIds?.length) {
      // Send to specific connections
      await sseService.sendNamedEvent(
        validatedEventData.eventName,
        validatedEventData.data,
        {
          connectionIds: validatedOptionsData.connectionIds,
        },
      );
    } else if (validatedOptionsData.userIds?.length) {
      // Send to specific users
      await sseService.sendNamedEventToUsers(
        validatedEventData.eventName,
        validatedEventData.data,
        validatedOptionsData.userIds,
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("SSE send event error:", error);
    return NextResponse.json(
      { error: "Failed to send event" },
      { status: 500 },
    );
  }
}

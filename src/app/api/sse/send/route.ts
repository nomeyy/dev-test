import { sseService } from "@/lib/sse";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const sendEventSchema = z.object({
  eventName: z.string(),
  data: z.record(z.unknown()),
  connectionIds: z.array(z.string()).optional(),
  userIds: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const validatedData = sendEventSchema.parse(body);

    // Validate that either connectionIds or userIds is provided
    if (!validatedData.connectionIds && !validatedData.userIds) {
      return NextResponse.json(
        { error: "Either connectionIds or userIds must be provided" },
        { status: 400 },
      );
    }

    if (validatedData.connectionIds) {
      // Send to specific connections
      await sseService.sendNamedEvent(
        validatedData.eventName,
        validatedData.data,
        {
          connectionIds: validatedData.connectionIds,
        },
      );
    } else if (validatedData.userIds) {
      // Send to specific users
      await sseService.sendNamedEventToUsers(
        validatedData.eventName,
        validatedData.data,
        validatedData.userIds,
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

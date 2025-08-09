import { getSession } from "@/features/auth";
import { NextRequest, NextResponse } from "next/server";

import { SseService } from "@/lib/sse/server";
import { createSseEvent } from "@/lib/sse/events";

export async function POST(req: NextRequest) {
  const session = await getSession();

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = await req.json();
  const { message } = body;

  if (!message || typeof message !== "string") {
    return new NextResponse("Invalid message", { status: 400 });
  }

  const event = createSseEvent("message", {
    message,
    timestamp: new Date().toISOString(),
  });

  SseService.send(session.user.id, event);

  return new NextResponse("Message sent", { status: 200 });
}

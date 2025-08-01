import { NextRequest, NextResponse } from "next/server";
import { sseManager } from "@/features/notifications";
import { authConfig } from "@/config/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get(authConfig.sessionCookieName)?.value;
  if (!sessionCookie) {
    return new NextResponse("Unauthorized - no session token", { status: 401 });
  }

  const session = await db.session.findUnique({
    where: { sessionToken: sessionCookie },
    include: { user: true },
  });

  const userId = session?.user?.id;
  if (!userId) {
    return new NextResponse("Unauthorized - invalid session", { status: 401 });
  }

  let controllerRef: ReadableStreamDefaultController | null = null;
  const stream = new ReadableStream({
    start(controller) {
      controllerRef = controller;
      controller.enqueue(new TextEncoder().encode(`: connected\n\n`));
      controller.enqueue(new TextEncoder().encode(`event: ready\ndata: {}\n\n`));
    },
    cancel() {
      if (connectionId) {
        sseManager.removeConnection(userId, connectionId);
      }
    },
  });

  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  // connectionId generation (Node runtime supports crypto)
  const connectionId = crypto.randomUUID();

  if (!controllerRef) {
    return new NextResponse("Failed to initialize stream", { status: 500 });
  }

  // Minimal writer backed by the controller
  const writer = {
    write: (chunk: string) => {
      controllerRef!.enqueue(new TextEncoder().encode(chunk));
    },
    close: () => {
      controllerRef!.close();
    },
  };

  const connection = {
    connectionId,
    userId,
    res: writer as any,
    lastSeen: Date.now(),
  };

  sseManager.registerConnection(userId, connection);

  // Clean up when request aborts
  request.signal.addEventListener("abort", () => {
    sseManager.removeConnection(userId, connectionId);
  });

  return new NextResponse(stream, {
    status: 200,
    headers,
  });
}

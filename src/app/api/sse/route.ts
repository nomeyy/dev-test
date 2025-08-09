import { getSession } from "@/features/auth";
import { NextRequest, NextResponse } from "next/server";

import { SseService } from "@/lib/sse/server";

export async function GET(req: NextRequest) {
  const session = await getSession();
  const userId = session?.user?.id;

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const stream = new ReadableStream({
    start(controller) {
      SseService.addClient(userId, controller);

      // Send a ping immediately to confirm connection
      SseService.send(userId, { name: "ping", data: {} });

      const heartbeatId = SseService.startHeartbeat(userId, controller);

      req.signal.onabort = () => {
        clearInterval(heartbeatId);
        SseService.removeClient(userId, controller);
      };
    },
  });

  const res = new NextResponse(stream);
  res.headers.set("Content-Type", "text/event-stream");
  res.headers.set("Cache-Control", "no-cache");
  res.headers.set("Connection", "keep-alive");

  return res;
}

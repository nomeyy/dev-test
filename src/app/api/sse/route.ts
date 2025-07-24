import { sseService } from "../../../features/sse/services/sse-service";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const isAdmin = url.searchParams.get("admin") === "1";

  let clientId: string | undefined;

  const stream = new ReadableStream({
    start(controller) {
      if (isAdmin) {
        sseService.addAdmin(controller);
      } else {
        clientId = sseService.addClient(controller);
      }
      const cleanup = () => {
        if (isAdmin) {
          sseService.removeAdmin(controller);
        } else if (clientId) {
          sseService.removeClient(clientId);
        }
      };
      req.signal.addEventListener("abort", cleanup);
      // TEST ONLY: Force disconnect after 5 seconds (clients only)
      // if (!isAdmin) {
      //   setTimeout(() => {
      //     controller.close();
      //     cleanup();
      //   }, 5000);
      // }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

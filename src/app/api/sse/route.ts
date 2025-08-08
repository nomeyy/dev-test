import { getSession } from "@/features/auth";
import { SSEManager } from "@/lib/sse";

export async function GET() {
  const session = await getSession();
  const user = session?.user;

  if (!user) {
    return new Response("Unauthorized client", {
      status: 401,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const stream = new ReadableStream({
    start(controller) {
      SSEManager.getInstance().addClient(controller, user);
    },
    cancel() {
      SSEManager.getInstance().removeClient(user.id);
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

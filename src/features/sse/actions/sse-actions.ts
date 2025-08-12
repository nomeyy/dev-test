import { auth } from "@/features/auth/handlers";
import {
  JsonSerializable,
  SSEClientId,
  SSEEventName,
  sseManager,
} from "@/features/sse";

// Start an SSE stream. Only for authenticated users.
export const handleAuthSSE = async (_request: Request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { stream } = sseManager.createClientConnection(session.user.id);
  return new Response(stream, { headers: sseHeaders() });
};

export const sseHeaders = () => ({
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
});

export const sendEventToUser = (
  clientId: SSEClientId,
  event: SSEEventName,
  data: JsonSerializable,
) => {
  return sseManager.sendToClient(clientId, event, data);
};

export const broadcastEvent = (event: SSEEventName, data: JsonSerializable) => {
  return sseManager.broadcast(event, data);
};

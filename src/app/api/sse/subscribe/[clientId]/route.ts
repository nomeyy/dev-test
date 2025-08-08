// app/api/sse/subscribe/[clientId]/route.ts
import { createSSEStream } from "../../../../../lib/sse";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: { clientId: string } },
) {
  const { clientId } = params;
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name") ?? undefined;

  // create the stream for this client
  const { stream } = createSSEStream(clientId, name);

  // return Response with proper headers for EventSource
  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // CORS: if you need cross-origin, add Access-Control-Allow-Origin here
    },
  });
}

import { createEventStream, startHeartbeat } from "@/lib/sse";
import jwt from "jsonwebtoken";
import { parse } from "url";

const JWT_SECRET = process.env.JWT_SECRET || "changeme";

export async function GET(request: Request) {
  try {
    // allow token via Authorization header OR ?token= query param (useful for EventSource)
    const url = new URL(request.url);
    let token: string | null = "";
    const auth = request.headers.get("authorization") || "";
    if (auth.startsWith("Bearer ")) token = auth.slice(7);
    else if (url.searchParams.get("token"))
      token = url.searchParams.get("token");

    if (!token) return new Response("Unauthorized", { status: 401 });

    let payload: any;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return new Response("Invalid token", { status: 401 });
    }
    const userId = payload.userId;

    // create a stream for this user
    const { stream, close } = createEventStream(userId);

    // ensure heartbeat running
    startHeartbeat();

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    console.error(e);
    return new Response("Server error", { status: 500 });
  }
}

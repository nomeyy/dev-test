import { disconnectUser } from "@/lib/sse";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "changeme";

export async function POST(request: Request) {
  try {
    // allow token via Authorization header OR ?token= query param
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

    // Actually disconnect the user
    const result = disconnectUser(userId);

    return new Response(
      JSON.stringify({
        success: true,
        message: "User disconnected",
        connectionsClosed: result.disconnected,
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (e) {
    console.error(e);
    return new Response("Server error", { status: 500 });
  }
}

import { NextRequest } from "next/server";
import { getActiveClients } from "@/features/sse";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const { searchParams } = request.nextUrl;
    const filter = {
      userId: searchParams.get("userId") || undefined,
      sessionId: searchParams.get("sessionId") || undefined,
      clientIds: searchParams.get("clientIds")?.split(",") || undefined,
      metadata: Object.fromEntries(
        Array.from(searchParams.entries()).filter(
          ([key]) =>
            key !== "userId" && key !== "sessionId" && key !== "clientIds",
        ),
      ),
    };
    const clients = getActiveClients(filter);
    const response = clients.map((client) => ({
      id: client.id,
      userId: client.userId,
      sessionId: client.sessionId,
      connectedAt: client.connectedAt,
      lastPing: client.lastPing,
      metadata: client.metadata, // Includes eventCount
    }));
    return new Response(JSON.stringify(response), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response("Internal Server Error", { status: 500 });
  }
}

import { sseManager } from "../../../../lib/sseManager";
import { type NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body: unknown = await req.json().catch(() => undefined);

  if (!body || typeof body !== "object") {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const b = body as {
    event?: string;
    payload?: unknown;
    userId?: string;
    userIds?: string[];
    message?: string;
  };

  const eventName = b.event ?? (b.message ? "message" : "custom");
  const payload = b.message ?? b.payload ?? { ok: true };

  if (b.userId && b.userIds) {
    return new Response(
      JSON.stringify({ error: "Provide either userId or userIds, not both" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (b.userId) {
    sseManager.sendToUser(b.userId, eventName, payload);
  } else if (Array.isArray(b.userIds)) {
    sseManager.sendToUsers(b.userIds, eventName, payload);
  } else {
    sseManager.broadcast(eventName, payload);
  }

  return new Response(JSON.stringify({ status: "sent" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

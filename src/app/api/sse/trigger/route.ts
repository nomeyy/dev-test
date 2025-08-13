import { sendEventToUser, broadcast } from "@/lib/sse";

const ADMIN_TOKEN = process.env.ADMIN_TRIGGER_TOKEN || "admintoken";

type TriggerRequestBody = {
  userId?: string;
  eventName: string;
  payload?: unknown;
};

export async function POST(request: Request) {
  // Simple protection: require ADMIN_TRIGGER_TOKEN header
  const secret = request.headers.get("x-admin-token") || "";
  console.log(secret);
  if (secret !== ADMIN_TOKEN) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = (await request.json()) as TriggerRequestBody;
  const { userId, eventName, payload } = body;

  if (!eventName) {
    return new Response(JSON.stringify({ error: "eventName required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (userId) {
    const res = sendEventToUser(userId, eventName, payload ?? {});
    return new Response(JSON.stringify({ ok: true, sent: res.sent }), {
      headers: { "Content-Type": "application/json" },
    });
  } else {
    const res = broadcast(eventName, payload ?? {});
    return new Response(JSON.stringify({ ok: true, total: res.total }), {
      headers: { "Content-Type": "application/json" },
    });
  }
}

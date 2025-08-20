import sseManager from "@/lib/sse/sseManager";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const clientId = body?.clientId;
  const event = body?.event ?? "notification";
  const data = body?.data ?? { msg: "hello" };

  if (!clientId)
    return new Response(JSON.stringify({ error: "clientId required" }), {
      status: 400,
    });

  const sent = sseManager.sendToClient(clientId, { event, data });

  return new Response(JSON.stringify({ sent }), { status: 200 });
}

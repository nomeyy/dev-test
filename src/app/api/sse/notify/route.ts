// app/api/sse/notify/route.ts
import { NextResponse } from "next/server";
import { sendEvent, broadcast, totalConnections } from "../../../../lib/sse";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      clientId?: string;
      event?: string;
      payload?: unknown;
      broadcast?: boolean;
    };
    const {
      clientId,
      event = "notification",
      payload = {},
      broadcast: doBroadcast = false,
    } = body;

    if (doBroadcast) {
      broadcast(event, payload);
      return NextResponse.json({
        ok: true,
        broadcast: true,
        connections: totalConnections(),
      });
    }

    if (!clientId) {
      return NextResponse.json(
        { ok: false, error: "clientId required unless broadcast=true" },
        { status: 400 },
      );
    }

    const sent = sendEvent(clientId, event, payload);
    return NextResponse.json({
      ok: true,
      sent,
      clientId,
      connections: totalConnections(),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}

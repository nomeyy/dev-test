import { auth } from "@/features/auth/handlers";
import { clients } from "@/lib/sse/SSEmanager";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export const POST = auth(async (req) => {
  const user = req.auth?.user;
  const cookiesStore = await cookies();
  const body = (await req.json()) as { clientId: string; message: string };

  const sourceClient = cookiesStore.get("clientId")?.value ?? "";

  const clientId = body.clientId;
  const message = body.message;

  const client = clients[clientId];

  if (!client) {
    // return NextResponse.json({ error: "Client ID not found" }, { status: 400 });
    // broadcast
    for (const clientId in clients) {
      clients[clientId]?.writeData({
        data: {
          message,
          type: "broadcast",
          sender: { clientId: sourceClient, user },
        },
      });
    }
    return;
  }

  client?.writeData({
    data: {
      message,
      type: "message",
      sender: { clientId: sourceClient, user },
    },
  });

  return NextResponse.json("Sent message", { status: 200 });
});

import { auth } from "@/features/auth/handlers";
import { clients } from "@/lib/sse/SSEmanager";
import { NextResponse } from "next/server";

export const GET = auth(async () => {
  const clientsArray = Object.values(clients);
  const connections = clientsArray.map((client) => ({
    clientId: client.clientId,
    session: client.session,
  }));

  return NextResponse.json(connections);
});

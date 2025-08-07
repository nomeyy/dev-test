import { sseService } from "../../../../features/sse/unified-sse-service";
import { NextResponse } from "next/server";

export const GET = async () => {
  const clients = sseService.getAllClients();
  return NextResponse.json({
    clients,
    total: clients.length,
    timestamp: Date.now(),
  });
};

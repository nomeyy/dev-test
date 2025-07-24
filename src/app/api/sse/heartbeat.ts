import { NextRequest, NextResponse } from "next/server";
import { SSEManager } from "@/features/sse";

let sseManager: SSEManager | null = null;
function getSSEManager(): SSEManager {
  if (!sseManager) {
    sseManager = new SSEManager({
      heartbeatInterval: 30000,
      connectionTimeout: 300000,
      maxConnections: 1000,
      enableRedis: false,
      enableLogging: true,
      enableMetrics: true,
    });
  }
  return sseManager;
}

export async function POST(request: NextRequest) {
  const { clientId } = await request.json();
  if (!clientId) {
    return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
  }
  const manager = getSSEManager();
  await manager.updateHeartbeat(clientId);
  return NextResponse.json({ ok: true });
}

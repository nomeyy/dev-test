import { NextResponse } from "next/server";
import { SSEManager } from "@/features/sse";
import { SSEConnectionState } from "../../features/sse/types/sse-types.js";

// Use the same singleton instance as the main SSE route
let sseManager: SSEManager | null = null;
function getSSEManager(): SSEManager {
  if (!sseManager) {
    sseManager = new SSEManager({
      heartbeatInterval: 30000,
      connectionTimeout: 120000,
      maxConnections: 1000,
      enableRedis: false,
      enableLogging: true,
      enableMetrics: true,
    });
  }
  return sseManager;
}

export async function GET() {
  const manager = getSSEManager();
  const stats = manager.getStats();
  // Add connection state counts
  const clients = manager.getConnectedClients();
  const stateCounts: Record<string, number> = {};
  for (const state of Object.values(SSEConnectionState)) {
    stateCounts[state] = clients.filter((c) => c.state === state).length;
  }
  return NextResponse.json({ ...stats, stateCounts });
}

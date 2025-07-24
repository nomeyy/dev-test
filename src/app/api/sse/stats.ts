import { NextResponse } from "next/server";
import { SSEManager } from "@/features/sse";
import { SSEConnectionState } from "../../../features/sse/types/sse-types";
import { getActiveSSEConnections } from "../../../features/sse/services/sse-connection-db";
import type { SSEConnection } from "@prisma/client";

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

export async function GET() {
  const manager = getSSEManager();
  const stats = manager.getStats();
  // Add connection state counts from DB
  try {
    const dbConnections = (await getActiveSSEConnections()) as SSEConnection[];
    const stateCounts: Record<string, number> = {};
    for (const state of Object.values(SSEConnectionState)) {
      stateCounts[state] = dbConnections.filter(
        (c: any) => c.state === state,
      ).length;
    }
    return NextResponse.json({
      ...stats,
      dbConnectionCount: dbConnections.length,
      stateCounts,
    });
  } catch (error) {
    return NextResponse.json({
      ...stats,
      dbError: error instanceof Error ? error.message : String(error),
    });
  }
}

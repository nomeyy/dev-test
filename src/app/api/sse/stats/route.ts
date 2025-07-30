import { NextResponse } from "next/server";
import { getSSEManager } from "@/features/sse";
import { getSession } from "@/features/auth";

/**
 * API endpoint to get SSE connection statistics
 * GET /api/sse/stats
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sseManager = getSSEManager();
    const stats = sseManager.getStats();

    return NextResponse.json({
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("SSE stats endpoint error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

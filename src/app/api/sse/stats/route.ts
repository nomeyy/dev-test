import { NextRequest, NextResponse } from "next/server";
import { sseManager } from "@/features/sse";

/**
 * Get SSE connection statistics
 * GET /api/sse/stats - Returns connection statistics
 */
export async function GET(request: NextRequest) {
  try {
    const stats = sseManager.getStats();

    return NextResponse.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("SSE stats endpoint error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve SSE statistics" },
      { status: 500 },
    );
  }
}

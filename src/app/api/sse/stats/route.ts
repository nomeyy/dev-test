import { type NextRequest } from "next/server";
import { getSession } from "@/features/auth";
import { sseService } from "@/features/sse";

/**
 * GET /api/sse/stats
 * Get SSE connection statistics (protected endpoint)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stats = sseService.getStats();

    return Response.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[SSE Stats] Error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

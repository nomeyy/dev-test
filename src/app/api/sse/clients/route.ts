import type { NextRequest } from "next/server";
import { sseManager } from "@/features/sse";

export async function GET(_request: NextRequest) {
  try {
    const clientCount = sseManager.getClientCount();

    return Response.json({
      success: true,
      clientCount,
      message: `Currently ${clientCount} active SSE client${clientCount !== 1 ? "s" : ""}`,
    });
  } catch (error) {
    console.error("Error getting client count:", error);
    return Response.json(
      { success: false, message: "Failed to get client count" },
      { status: 500 },
    );
  }
}

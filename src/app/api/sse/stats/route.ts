import { sseService } from "@/features/sse";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const stats = await sseService.getStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Page stats error:", error);
    return NextResponse.json(
      { error: "Failed to get Page stats" },
      { status: 500 },
    );
  }
}

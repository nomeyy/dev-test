import { getSession } from "@/features/auth";
import { sseService } from "@/features/sse";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") ?? session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    const userStats = await sseService.getUserStats(userId);

    if (!userStats) {
      return NextResponse.json({
        userId,
        activeConnections: 0,
        message: "No active connections found for this user",
      });
    }

    return NextResponse.json(userStats);
  } catch (error) {
    console.error("User stats error:", error);
    return NextResponse.json(
      { error: "Failed to get user stats" },
      { status: 500 },
    );
  }
}

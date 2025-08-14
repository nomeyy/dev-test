import { sseService } from "@/features/sse";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const usersWithActiveConnections =
      await sseService.getUsersWithActiveConnections();

    return NextResponse.json({
      totalUsers: usersWithActiveConnections.length,
      users: usersWithActiveConnections,
    });
  } catch (error) {
    console.error("Users active connections error:", error);
    return NextResponse.json(
      { error: "Failed to get users with active connections" },
      { status: 500 },
    );
  }
}

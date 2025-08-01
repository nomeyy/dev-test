import { NextRequest, NextResponse } from "next/server";
import { sseManager } from "@/features/notifications";

export async function GET(_: NextRequest) {
  const clients = sseManager.listConnections();
  return NextResponse.json({ clients });
}

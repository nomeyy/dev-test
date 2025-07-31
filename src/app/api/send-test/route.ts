import { NextRequest, NextResponse } from 'next/server';
import { sseManager } from '@/lib/sseManager';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  if (body.userId) {
    sseManager.sendToUser(body.userId, 'notification', 'This is a test message.');
  } else {
    sseManager.broadcast('notification', 'This is a test message.');
  }

  return NextResponse.json({ success: true });
}

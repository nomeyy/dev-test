import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSSEManager } from '@/features/sse';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const event: string | undefined = body?.event;
    const data: unknown = body?.data;

    if (!event) {
      return NextResponse.json({ error: 'event_required' }, { status: 400 });
    }

    const manager = getSSEManager();
    const sent = manager.broadcast({ event, data, timestamp: new Date() });
    console.log('[SSE:Send] action=broadcast', { event, sent });
    return NextResponse.json({ sent });
  } catch (error) {
    console.error('[SSE:Send] status=error', error);
    return NextResponse.json({ error: 'broadcast_failed' }, { status: 500 });
  }
}



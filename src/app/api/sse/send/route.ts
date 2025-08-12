import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSSEManager } from '@/features/sse';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const clientId: string | undefined = body?.clientId;
    const connectionId: string | undefined = body?.connectionId;
    const event: string | undefined = body?.event;
    const data: unknown = body?.data;

    if ((!clientId && !connectionId) || !event) {
      return NextResponse.json({ error: 'clientId_or_connectionId_and_event_required' }, { status: 400 });
    }

    const manager = getSSEManager();
    const target = connectionId ? { connectionId } : { clientId };
    // Validate target exists before sending
    const preview = manager.getActiveClients().filter(c =>
      (target as any).connectionId ? c.connectionId === (target as any).connectionId : c.clientId === (target as any).clientId
    );
    if (preview.length === 0) {
      const reason = connectionId ? `No active connection for connectionId=${connectionId}` : `No active connections for clientId=${clientId}`;
      return NextResponse.json({ error: 'no_targets', message: reason }, { status: 404 });
    }
    const sent = manager.sendEvent({ event, data, timestamp: new Date() }, target);
    console.log('[SSE:Send] action=send', { clientId, connectionId, event, sent });
    if (sent === 0) {
      const reason = connectionId ? `No active connection for connectionId=${connectionId}` : `No active connections for clientId=${clientId}`;
      return NextResponse.json({ error: 'no_targets', message: reason }, { status: 404 });
    }
    return NextResponse.json({ sent });
  } catch (error) {
    console.error('[SSE:Send] status=error', error);
    return NextResponse.json({ error: 'send_failed' }, { status: 500 });
  }
}



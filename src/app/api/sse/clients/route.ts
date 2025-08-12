import { NextResponse } from 'next/server';
import { getSSEManager } from '@/features/sse';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const manager = getSSEManager();
    const active = manager.getActiveClients();
    const clients = active.map((c) => ({
      connectionId: c.connectionId,
      clientId: c.clientId,
      userId: c.userId,
      role: c.role,
      connectedAt: c.connectionTime.toISOString(),
      lastActivity: c.lastActivity.toISOString(),
      isAlive: c.isAlive,
    }));
    console.log('[SSE:Clients] status=list count=', clients.length);
    return NextResponse.json({ count: clients.length, clients }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[SSE:Clients] status=error', error);
    return NextResponse.json({ error: 'failed_to_list_clients' }, { status: 500 });
  }
}



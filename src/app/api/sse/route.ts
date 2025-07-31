export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { sseManager } from '@/lib/sseManager';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') || 'anonymous';

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const clientId = crypto.randomUUID();
  sseManager.addClient({ clientId, userId, writer });

  writer.write(encoder.encode(`event: clientId\ndata: ${clientId}\n\n`));

  const interval = setInterval(() => {
    writer.write(encoder.encode(`event: ping\ndata: ${Date.now()}\n\n`));
  }, 30000);

  req.signal.addEventListener('abort', () => {
    clearInterval(interval);
    sseManager.removeClient(clientId);
  });

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

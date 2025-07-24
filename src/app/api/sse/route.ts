import { getSSEManager } from '@/features/sse';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get('clientId');
  const stream = new TransformStream();
  const writer = stream.writable.getWriter() as WritableStreamDefaultWriter<Uint8Array>;
  const sseManager = getSSEManager();

  sseManager.connectClient({ writer: writer, clientId: clientId! });
  req.signal.addEventListener('abort', () => {
    sseManager.disconnectClient(clientId!);
    void writer.close();
  });


  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
import { NextRequest } from 'next/server';
import { sseManager } from '@/features/sse';
import { getSession } from '@/features/auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  let resRef: { write: (chunk: string) => void; end: () => void } | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const res = {
        write: (chunk: string) => controller.enqueue(new TextEncoder().encode(chunk)),
        end: () => controller.close(),
      };
      resRef = res;
      sseManager.addClient(session.user.id, res);
      res.write(`event: connected\ndata: {}\n\n`);
    },
    cancel() {
      if (resRef) {
        sseManager.removeClient(session.user.id, resRef);
        resRef = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
} 
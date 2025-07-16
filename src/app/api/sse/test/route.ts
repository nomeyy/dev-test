import { NextRequest } from 'next/server';
import { getSession } from '@/features/auth';
import { sendSSEToUser } from '@/features/sse';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }
  sendSSEToUser(session.user.id, 'test', { message: 'Test event from server at ' + new Date().toISOString() });
  return new Response('ok');
} 
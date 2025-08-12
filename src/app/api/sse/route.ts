import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSSEManager } from '@/features/sse';
import { auth } from '@/features/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    // Get session for authentication
    const session = await auth();
    const url = new URL(request.url);
    const providedClientId = url.searchParams.get('clientId') ?? undefined;
    const role = url.searchParams.get('role') ?? undefined;
    // Resolve client identity
    const clientId = providedClientId ?? uuidv4();
    
    // Create response stream
    const stream = new ReadableStream({
      start(controller) {
        const sseManager = getSSEManager();
        
        // Create send function for this client
        const sendFunction = (data: string) => {
          try {
            controller.enqueue(new TextEncoder().encode(data));
          } catch (error) {
            console.error('Error sending SSE data:', error);
          }
        };

        // Create close function for this client
        const closeFunction = () => {
          try {
            controller.close();
          } catch (error) {
            console.error('Error closing SSE stream:', error);
          }
        };

        // Register client with SSE manager
        const client = sseManager.registerClient(
          clientId,
          sendFunction,
          closeFunction,
          {
            userId: session?.user?.id,
            role,
          }
        );

        // Send initial connection event
        const serverId = (globalThis as any).__SSE_SERVER_ID__ ?? ((globalThis as any).__SSE_SERVER_ID__ = `srv-${uuidv4().slice(0,8)}`);
        sendFunction(`event: connected\ndata: ${JSON.stringify({ serverId, clientId, connectionId: client.connectionId, role, timestamp: new Date().toISOString() })}\n\n`);

        // Handle client disconnect
        request.signal.addEventListener('abort', () => {
          console.log('[SSE:Stream] status=client_closed', { clientId, connectionId: client.connectionId, role });
          sseManager.removeClient(client.connectionId, 'client_disconnect');
        });

        // Handle stream errors
        controller.error = (error) => {
          console.error('[SSE:Stream] status=stream_error', error);
          sseManager.removeClient(client.connectionId, 'stream_error');
        };
      },
    });

    // Return SSE response
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });
  } catch (error) {
    console.error('SSE connection error:', error);
    return NextResponse.json(
      { error: 'Failed to establish SSE connection' },
      { status: 500 }
    );
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}

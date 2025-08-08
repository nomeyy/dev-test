import { NextRequest } from 'next/server';
import { getSSEManager } from '../../../features/sse/services/sse-instance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Handle SSE connection requests
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[SSE] Connection request received:', request.url);
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || undefined;
    const sessionId = searchParams.get('sessionId') || undefined;

    // Get or create SSE manager instance
    const sseManager = getSSEManager();

    // Create a new SSE connection
    const { response, clientId } = sseManager.createConnection(userId, sessionId);

    console.log(`[SSE] New connection established: ${clientId} (User: ${userId}, Session: ${sessionId})`);

    return response;
  } catch (error) {
    console.error('[SSE] Connection error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }), 
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

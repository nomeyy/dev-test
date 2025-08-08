import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSSEManager } from '../../../../features/sse/services/sse-instance';
import type { SSEEventPayload } from '../../../../features/sse/types/index';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Validation schema for SSE message payload
const SSEMessageSchema = z.object({
  event: z.string().min(1),
  data: z.any(),
  targetUserId: z.string().optional(),
  targetSessionId: z.string().optional(),
  targetClientId: z.string().optional(),
});

/**
 * Send a message through SSE to connected clients
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the payload
    const payload = SSEMessageSchema.parse(body) as SSEEventPayload;
    
    // Get SSE manager
    const sseManager = getSSEManager();
    // Send the message
    const sentCount = sseManager.sendMessage(payload);
    
    console.log(`[SSE] Message sent: ${payload.event}, Recipients: ${sentCount}`);
    
    return NextResponse.json({
      success: true,
      event: payload.event,
      sentCount,
      timestamp: new Date(),
    });
    
  } catch (error) {
    console.error('[SSE] Send message error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid payload', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get SSE connection statistics
 */
export async function GET() {
  try {
    const sseManager = getSSEManager();
    const stats = sseManager.getStats();
    const connections = sseManager.getConnections();
    
    return NextResponse.json({
      stats,
      connections: connections.map(conn => ({
        ...conn,
        connectedAt: conn.connectedAt.toISOString(),
        lastHeartbeat: conn.lastHeartbeat.toISOString(),
      })),
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('[SSE] Stats error:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

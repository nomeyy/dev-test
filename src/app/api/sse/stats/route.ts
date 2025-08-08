/**
 * SSE Statistics Endpoint
 * 
 * GET /api/sse/stats - Get SSE system statistics
 */

import { type NextRequest } from 'next/server';
import { getSSEService } from '@/lib/sse';
import { createSuccessResponse, createErrorResponse } from '../utils';

// Get SSE service instance
const sseService = getSSEService();

export async function GET(request: NextRequest) {
  try {
    // Get comprehensive metrics
    const metrics = sseService.getMetrics();
    const health = sseService.getHealth();
    const status = sseService.getStatus();
    
    // Get detailed report if requested
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';
    
    if (detailed) {
      const report = sseService.getDetailedReport();
      return createSuccessResponse(report);
    }
    
    // Return standard metrics
    return createSuccessResponse({
      health,
      metrics,
      status: {
        initialized: status.initialized,
        shuttingDown: status.shuttingDown
      },
      connections: {
        current: sseService.getConnectionCount(),
        max: status.config.maxConnections,
        utilization: `${Math.round((sseService.getConnectionCount() / status.config.maxConnections) * 100)}%`
      }
    });
  } catch (error) {
    console.error('Failed to get stats:', error);
    return createErrorResponse(
      'Failed to retrieve statistics',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
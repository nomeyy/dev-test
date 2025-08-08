/**
 * SSE Connection Endpoint
 * 
 * GET /api/sse - Establish SSE connection
 */

import { type NextRequest } from 'next/server';
import { getSSEService, SSEErrorCode } from '@/lib/sse';
import {
  createErrorResponse,
  createSSEHeaders,
  extractClientMetadata,
  parseQueryParams,
  ConnectionParamsSchema
} from './utils';

// Initialize SSE service
const sseService = getSSEService();

// Ensure service is initialized
sseService.initialize().catch(console.error);

export async function GET(request: NextRequest) {
  try {
    // Parse and validate query parameters
    const params = parseQueryParams(request.url);
    const validation = ConnectionParamsSchema.safeParse(params);
    
    if (!validation.success) {
      return createErrorResponse(
        'Invalid connection parameters',
        400,
        validation.error.errors
      );
    }
    
    // Extract client metadata
    const metadata = extractClientMetadata(request);
    
    // Create SSE connection
    const result = sseService.createConnection({
      userId: validation.data.userId,
      sessionId: validation.data.sessionId,
      metadata
    });
    
    if (!result.success) {
      return createErrorResponse(
        result.error.message,
        result.error.code === SSEErrorCode.MAX_CONNECTIONS_REACHED ? 503 : 500,
        result.error.details
      );
    }
    
    const { clientId, stream } = result.data;
    
    console.info('SSE connection established', {
      clientId,
      userId: validation.data.userId,
      sessionId: validation.data.sessionId,
      userAgent: metadata.userAgent
    });
    
    // Return the stream with SSE headers
    return new Response(stream, {
      headers: createSSEHeaders()
    });
  } catch (error) {
    console.error('Failed to establish SSE connection:', error);
    return createErrorResponse(
      'Failed to establish SSE connection',
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
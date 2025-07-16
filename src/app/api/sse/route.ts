import { NextRequest } from 'next/server';
import { sseManager } from '@/lib/sse/sseManager';

export async function GET(request: NextRequest) {
  return sseManager.createConnection(request);
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
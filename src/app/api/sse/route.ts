import { NextRequest } from 'next/server';
import {SSEManager} from "@/lib/see/manager";
import {SSEClient} from "@/lib/see/types";
import { randomUUID } from 'crypto';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const sessionId = searchParams.get('sessionId') || randomUUID();

    // Create a ReadableStream for SSE
    const stream = new ReadableStream({
        start(controller) {
            const clientId = randomUUID();
            const client: SSEClient = {
                id: clientId,
                userId: userId || undefined,
                sessionId,
                response: new Response(), // Placeholder, not used in this context
                controller,
                lastPing: Date.now(),
                metadata: {
                    userAgent: request.headers.get('user-agent'),
                    ip: request.headers.get('x-forwarded-for') ||
                        request.headers.get('x-real-ip') || 'unknown',
                    connectedAt: new Date().toISOString()
                }
            };

            try {
                const sseManager = SSEManager.getInstance();
                sseManager.addClient(client);

                // Handle client disconnect
                request.signal?.addEventListener('abort', () => {
                    sseManager.removeClient(clientId);
                });

            } catch (error) {
                console.error('Error setting up SSE client:', error);
                controller.error(error);
            }
        },

        cancel() {
            // This will be called when the client disconnects
            console.log('SSE stream cancelled');
        }
    });

    // Return the SSE response with proper headers
    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET',
            'Access-Control-Allow-Headers': 'Cache-Control'
        }
    });
}
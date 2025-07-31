// app/api/sse/route.ts
import { NextRequest } from 'next/server';
import sseManager from '@/lib/sseManager';

export const runtime = 'nodejs'; // Ensures the route runs in a Node.js environment for stream support

// Handles GET requests for establishing SSE connections
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');

    // Validate clientId
    if (!clientId) {
        return new Response('Missing clientId', { status: 400 });
    }

    const encoder = new TextEncoder();

    // Create a ReadableStream to push SSE data
    const stream = new ReadableStream({
        start(controller) {
            // Method to send data to the client
            const write = (data: string) => {
                try {
                    controller.enqueue(encoder.encode(data));
                } catch (err) {
                    console.warn(`Failed to write to stream for client ${clientId}:`, err);
                }
            };

            // Response object used by SSEManager
            const res = {
                write,
                end: () => {
                    try {
                        controller.close();
                    } catch (err) {
                        console.log(`Tried to close already closed stream for client: ${clientId}`, err);
                    }
                },
            };

            // Register the client with the SSEManager
            sseManager.addClient(clientId, res);

            // Send initial connected event
            write(`event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`);

            // Periodic keep-alive to prevent connection from being closed by proxies
            const keepAlive = setInterval(() => {
                write(`: keep-alive\n\n`);
            }, 15000);

            // Cleanup on client disconnect
            req.signal.addEventListener('abort', () => {
                clearInterval(keepAlive);
                sseManager.removeClient(clientId);
            });
        },
    });

    // Return the stream as a response with appropriate SSE headers
    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
        },
    });
}

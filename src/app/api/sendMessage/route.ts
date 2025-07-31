import { NextRequest, NextResponse } from 'next/server';
import sseManager from '@/lib/sseManager';

// Handles sending events to a specific client or all clients
export async function POST(req: NextRequest) {
    const body = await req.json();
    const { clientId, event, payload, broadcast } = body;

    // Validate required fields
    if (!event || !payload) {
        return NextResponse.json({ error: 'Missing event or payload' }, { status: 400 });
    }

    if (broadcast || clientId === '*') {
        // Broadcast to all clients
        console.log('Broadcasting event:', event);
        sseManager.broadcast(event, payload);
    } else if (clientId) {
        // Send to specific client
        console.log('Sending to client:', clientId);
        sseManager.send(clientId, event, payload);
    }

    return NextResponse.json({ success: true });
}

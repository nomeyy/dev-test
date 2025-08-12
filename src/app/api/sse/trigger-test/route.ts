import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { sseNotificationService } from '@/features/sse';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, data } = body;

    if (!event || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: event and data' },
        { status: 400 }
      );
    }

    // Send the test event to all connected clients
    const sentCount = sseNotificationService.broadcast(event, data);

    return NextResponse.json({
      success: true,
      message: `Test event '${event}' sent to ${sentCount} clients`,
      event,
      data,
      sentCount,
    });
  } catch (error) {
    console.error('Error triggering test event:', error);
    return NextResponse.json(
      { error: 'Failed to trigger test event' },
      { status: 500 }
    );
  }
}

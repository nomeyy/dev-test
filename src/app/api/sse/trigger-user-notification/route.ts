import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/features/auth';
import { sseNotificationService } from '@/features/sse';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { message, priority = 'normal' } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Missing required field: message' },
        { status: 400 }
      );
    }

    // Send notification to the authenticated user
    const sentCount = sseNotificationService.sendUserNotification(
      session.user.id,
      'user_notification',
      {
        message,
        priority,
        timestamp: new Date().toISOString(),
      },
      priority as 'low' | 'normal' | 'high'
    );

    return NextResponse.json({
      success: true,
      message: `User notification sent to ${sentCount} client(s)`,
      sentCount,
      targetUser: session.user.id,
    });
  } catch (error) {
    console.error('Error sending user notification:', error);
    return NextResponse.json(
      { error: 'Failed to send user notification' },
      { status: 500 }
    );
  }
}

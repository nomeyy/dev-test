import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/lib/notifications/notifications';

export async function POST(request: NextRequest) {
  try {
    const { userId, title, message, type = 'info' } = await request.json();

    if (!userId || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, title, message' },
        { status: 400 }
      );
    }

    const success = notificationService.sendToUser(userId, {
      title,
      message,
      type,
    });

    if (success) {
      return NextResponse.json({ success: true, message: 'Notification sent' });
    } else {
      return NextResponse.json(
        { error: 'Failed to send notification. User may not be connected.' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
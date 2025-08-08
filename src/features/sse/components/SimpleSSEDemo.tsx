'use client';
import { useState, useEffect } from 'react';
import { useSSE } from '../hooks/useSSE';
import { Button } from '../../shared/components/ui/button';

/**
 * Simple SSE demo with just a Button and Text component
 * as requested in the ticket
 */
export function SimpleSSEDemo() {
  const [displayMessage, setDisplayMessage] = useState('No message received yet');
  const { isConnected, lastMessage, connect, disconnect, addEventListener } = useSSE('/api/sse', {
    userId: 'simple-demo-user',
    autoConnect: false,
  });

  // Update display when new message arrives
  useEffect(() => {
    if (lastMessage) {
      const messageText = typeof lastMessage.data === 'string'
        ? lastMessage.data
        : JSON.stringify(lastMessage.data);

      setDisplayMessage(`[${lastMessage.event}] ${messageText}`);
    }
  }, [lastMessage]);

  // Handle connection events
  useEffect(() => {
    // Handle different message types
    addEventListener('notification', (data) => {
      console.log('Received notification:', data);
    });

    addEventListener('user-action', (data) => {
      console.log('Received user action:', data);
    });

    addEventListener('system-notification', (data) => {
      console.log('Received system notification:', data);
    });

    addEventListener('test-event', (data) => {
      console.log('Received test event:', data);
    });

    addEventListener('test-message', (data) => {
      console.log('Received test event:', data);
    });
  }, [isConnected,addEventListener]);

  const sendTestMessage = async () => {
    try {
      await fetch('/api/sse/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'test-message',
          data: {
            message:"hello",
            type:"test"
          },
          targetUserId: 'full-demo-user',
        }),
      });
    } catch (error) {
      console.error('Failed to send test message:', error);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto text-black">
      <div className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={isConnected ? disconnect : connect}
            variant={isConnected ? "destructive" : "default"}
          >
            {isConnected ? 'Disconnect' : 'Connect'}
          </Button>

          <Button
            onClick={sendTestMessage}
            disabled={!isConnected}
            variant="outline"
          >
            Send Test Message
          </Button>
        </div>

        <div className="p-4 bg-gray-100 rounded border min-h-[60px] flex items-center">
          <p className="text-sm text-black">
            <strong>Status:</strong> {isConnected ? 'Connected' : 'Disconnected'}
            <br />
            <strong>Latest Message:</strong> {displayMessage}
          </p>
        </div>
      </div>
    </div>
  );
}
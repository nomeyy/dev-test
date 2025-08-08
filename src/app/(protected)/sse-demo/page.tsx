import { SSEDemo } from '../../../features/sse/components/SSEDemo';
import { SimpleSSEDemo } from '../../../features/sse/components/SimpleSSEDemo';

export default async function SSEDemoPage() {
  return (
    <div className="min-h-screen py-8 rounded-md ">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">
            Server-Sent Events (SSE) Demo
          </h1>
          <p className="text-gray-300 mb-8">
            Demonstrating real-time server-to-client notifications using SSE
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Simple Demo */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Simple Demo</h2>
            <p className="text-gray-600 mb-4">
              Basic SSE demo with a Button and Text component as requested.
            </p>
            <SimpleSSEDemo />
          </div>

          {/* Full Featured Demo */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Full Featured Demo</h2>
            <p className="text-gray-600 mb-4">
              Complete SSE demo showing all features including connection management,
              different message types, and real-time updates.
            </p>
            <div className="max-h-[600px] overflow-y-auto">
              <SSEDemo userId="full-demo-user" sessionId="demo-session-123" />
            </div>
          </div>
        </div>

        {/* Documentation */}
        <div className="bg-gray-900 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">How to Use SSE in Your App</h2>
          <div className="prose max-w-none">
            <h3 className="text-lg font-medium mb-2">Backend Integration</h3>
            <pre className="bg-gray-700 text-white p-4 rounded text-sm overflow-x-auto mb-4">
                {`import { notifyUser, broadcastNotification } from '@/features/sse';

                // Send notification to a specific user
                notifyUser('user-123', 'notification', {
                  title: 'New Message',
                  message: 'You have received a new message'
                });

                // Broadcast to all connected clients
                broadcastNotification('announcement', {
                  message: 'System maintenance starting soon',
                  type: 'warning'
                });`}
            </pre>

            <h3 className="text-lg font-medium mb-2">Frontend Integration</h3>
            <pre className="bg-gray-700 text-white p-4 rounded text-sm overflow-x-auto mb-4">
                {`import React, { useEffect } from 'react';
                import { useSSE } from '@/features/sse';

                function MyComponent() {
                  const { isConnected, lastMessage, addEventListener } = useSSE('/api/sse', {
                    userId: 'user-123',
                    autoConnect: true,
                  });

                  useEffect(() => {
                    // Handle different event types
                    addEventListener('notification', (data) => {
                      console.log('New notification:', data);
                      // Show toast notification
                      showToast(data.title, data.message, data.type);
                    });

                    addEventListener('user-action', (data) => {
                      console.log('User action:', data);
                      // Update UI based on user action
                    });
                  }, [addEventListener]);

                  return (
                    <div>
                      <p>Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</p>
                      {lastMessage && (
                        <p>Last: [{lastMessage.event}] {JSON.stringify(lastMessage.data)}</p>
                      )}
                    </div>
                  );
                }`}
            </pre>

            <h3 className="text-lg font-medium mb-2">Features</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-300">
              <li>Real-time server-to-client messaging</li>
              <li>Automatic connection management and heartbeat</li>
              <li>Targeted messaging (by user, session, or client)</li>
              <li>Broadcast messaging to all clients</li>
              <li>Automatic reconnection with backoff</li>
              <li>Connection lifecycle management</li>
              <li>Built-in error handling and logging</li>
              <li>React hooks for easy frontend integration</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
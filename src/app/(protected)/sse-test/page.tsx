"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { SSEMessageDisplay } from "@/features/sse";
import { sseNotifications } from "@/features/sse";

export default function SSETestPage() {
  const [isSending, setIsSending] = useState(false);

  const sendTestNotification = async () => {
    setIsSending(true);
    try {
      // This would typically be called from a server action or API route
      // For demo purposes, we'll simulate it
      console.log("Sending test notification...");

      // In a real app, you'd call this from a server action:
      // await sseNotifications.notifyUser('user-id', 'notification', {
      //   title: 'Test Notification',
      //   message: 'This is a test notification',
      //   type: 'info'
      // });

      // For now, we'll just log it
      setTimeout(() => {
        console.log("Test notification sent");
        setIsSending(false);
      }, 1000);
    } catch (error) {
      console.error("Failed to send notification:", error);
      setIsSending(false);
    }
  };

  const sendSystemAlert = async () => {
    setIsSending(true);
    try {
      console.log("Sending system alert...");

      // In a real app, you'd call this from a server action:
      // await sseNotifications.sendSystemAlert(
      //   'System Maintenance',
      //   'The system will be down for maintenance in 5 minutes.',
      //   'warning'
      // );

      setTimeout(() => {
        console.log("System alert sent");
        setIsSending(false);
      }, 1000);
    } catch (error) {
      console.error("Failed to send system alert:", error);
      setIsSending(false);
    }
  };

  const sendStatusUpdate = async () => {
    setIsSending(true);
    try {
      console.log("Sending status update...");

      // In a real app, you'd call this from a server action:
      // await sseNotifications.sendStatusUpdate(
      //   'user-id',
      //   'processing',
      //   { progress: 75, stage: 'finalizing' }
      // );

      setTimeout(() => {
        console.log("Status update sent");
        setIsSending(false);
      }, 1000);
    } catch (error) {
      console.error("Failed to send status update:", error);
      setIsSending(false);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-8">
        <h1 className="mb-4 text-3xl font-bold">SSE Test Page</h1>
        <p className="mb-6 text-gray-600">
          This page demonstrates the Server-Sent Events (SSE) functionality. The
          SSE connection will automatically connect and display real-time
          events.
        </p>

        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h2 className="mb-2 text-lg font-semibold text-blue-800">
            How it works:
          </h2>
          <ul className="space-y-1 text-sm text-blue-700">
            <li>
              • The SSE connection automatically establishes when the page loads
            </li>
            <li>
              • Events are sent from the server to connected clients in
              real-time
            </li>
            <li>
              • The connection includes automatic reconnection and heartbeat
              support
            </li>
            <li>• Events are displayed with timestamps and formatted data</li>
          </ul>
        </div>
      </div>

      {/* Test Buttons */}
      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">Test Event Sending</h2>
        <div className="flex flex-wrap gap-4">
          <Button
            onClick={sendTestNotification}
            disabled={isSending}
            variant="outline"
          >
            {isSending ? "Sending..." : "Send Test Notification"}
          </Button>

          <Button
            onClick={sendSystemAlert}
            disabled={isSending}
            variant="outline"
          >
            {isSending ? "Sending..." : "Send System Alert"}
          </Button>

          <Button
            onClick={sendStatusUpdate}
            disabled={isSending}
            variant="outline"
          >
            {isSending ? "Sending..." : "Send Status Update"}
          </Button>
        </div>

        <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> These buttons simulate sending events. In a
            real application, events would be sent from server-side code (API
            routes, webhooks, background jobs, etc.) using the SSE notification
            service.
          </p>
        </div>
      </div>

      {/* SSE Message Display */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">SSE Connection & Events</h2>
        <SSEMessageDisplay
          showConnectionStatus={true}
          showEventHistory={true}
          maxHistoryItems={20}
        />
      </div>

      {/* Usage Examples */}
      <div className="mt-8 rounded-lg bg-gray-50 p-6">
        <h2 className="mb-4 text-xl font-semibold">Usage Examples</h2>

        <div className="space-y-4">
          <div>
            <h3 className="mb-2 font-medium text-gray-800">
              Server-side (API Route, Webhook, etc.)
            </h3>
            <pre className="overflow-x-auto rounded bg-gray-800 p-3 text-sm text-green-400">
              {`import { sseNotifications } from '@/features/sse';

// Send notification to specific user
await sseNotifications.notifyUser('user-id', 'notification', {
  title: 'New Message',
  message: 'You have a new message',
  type: 'info'
});

// Send system alert to all users
await sseNotifications.sendSystemAlert(
  'Maintenance Notice',
  'System will be down for maintenance',
  'warning'
);

// Send status update
await sseNotifications.sendStatusUpdate('user-id', 'processing', {
  progress: 50,
  stage: 'uploading'
});`}
            </pre>
          </div>

          <div>
            <h3 className="mb-2 font-medium text-gray-800">
              Client-side (React Component)
            </h3>
            <pre className="overflow-x-auto rounded bg-gray-800 p-3 text-sm text-green-400">
              {`import { useSSE } from '@/features/sse';

function MyComponent() {
  const { isConnected, lastEvent, error } = useSSE('/api/sse', {
    onMessage: (event) => {
      console.log('Received SSE event:', event);
    }
  });
  
  return (
    <div>
      <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
      {lastEvent && (
        <p>Last event: {lastEvent.event}</p>
      )}
    </div>
  );
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

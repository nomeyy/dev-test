"use client";

import React from 'react';
import { SSEConnectionStatus, SSEEventDisplay, useSSE, useSSESystemNotification } from '@/features/sse';

export default function SSEDemoPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Server-Sent Events Demo
        </h1>
        <p className="text-gray-600">
          This page demonstrates the SSE functionality with real-time updates, connection management, and event handling.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Connection and Controls */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Connection Status
            </h2>
            <SSEConnectionStatus />
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Manual Event Triggering
            </h2>
            <ManualEventTrigger />
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              System Notifications
            </h2>
            <SystemNotificationDisplay />
          </div>
        </div>

        {/* Right Column - Event Display */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Live Events
            </h2>
            <SSEEventDisplay 
              maxEvents={100}
              showEventType={true}
              showTimestamp={true}
              showData={true}
            />
          </div>
        </div>
      </div>

      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          How It Works
        </h2>
        <div className="prose max-w-none">
          <p className="text-gray-600 mb-4">
            This SSE implementation provides:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li><strong>Real-time Updates:</strong> Server can push events to connected clients instantly</li>
            <li><strong>Connection Management:</strong> Automatic reconnection, heartbeat, and cleanup</li>
            <li><strong>Event Filtering:</strong> Clients can subscribe to specific event types</li>
            <li><strong>User Targeting:</strong> Send notifications to specific users or sessions</li>
            <li><strong>Error Handling:</strong> Robust error handling and logging</li>
            <li><strong>Scalability:</strong> Efficient connection tracking and resource management</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function ManualEventTrigger() {
  const { isConnected } = useSSE();

  const triggerTestEvent = async () => {
    try {
      const response = await fetch('/api/sse/trigger-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: 'test',
          data: {
            message: 'This is a test event triggered manually',
            timestamp: new Date().toISOString(),
            random: Math.random(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to trigger event');
      }
    } catch (error) {
      console.error('Error triggering event:', error);
      alert('Failed to trigger event. Check console for details.');
    }
  };

  const triggerUserNotification = async () => {
    try {
      const response = await fetch('/api/sse/trigger-user-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'This is a user-specific notification',
          priority: 'normal',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send user notification');
      }
    } catch (error) {
      console.error('Error sending user notification:', error);
      alert('Failed to send user notification. Check console for details.');
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Manually trigger SSE events to test the system.
      </p>
      
      <div className="flex flex-wrap gap-3">
        <button
          onClick={triggerTestEvent}
          disabled={!isConnected}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Trigger Test Event
        </button>

        <button
          onClick={triggerUserNotification}
          disabled={!isConnected}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Send User Notification
        </button>
      </div>

      {!isConnected && (
        <p className="text-sm text-orange-600">
          Connect to SSE to enable event triggering
        </p>
      )}
    </div>
  );
}

function SystemNotificationDisplay() {
  const { events, isConnected } = useSSESystemNotification();

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        System notifications received via SSE.
      </p>

      {!isConnected && (
        <p className="text-sm text-orange-600">
          Connect to SSE to receive system notifications
        </p>
      )}

      {events.length === 0 ? (
        <p className="text-sm text-gray-500 italic">
          No system notifications yet
        </p>
      ) : (
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {events.slice(-5).map((event, index) => (
            <div
              key={`${event.id || index}-${event.timestamp.getTime()}`}
              className="text-sm p-2 bg-blue-50 border border-blue-200 rounded"
            >
              <div className="font-medium text-blue-800">
                {event.data.message}
              </div>
              <div className="text-xs text-blue-600">
                {event.timestamp.toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

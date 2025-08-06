"use client";

import React, { useState, useEffect } from 'react';
import { useSSE } from '@/lib/sse/client';
import type { SSEEventData } from '@/lib/sse/client';

// Define an interface for the expected API response to ensure type safety
interface ReportGenerationResult {
  reportId: string;
}

// Define specific data shapes for different SSE events to improve type safety
interface ReportEventData {
  status: string;
  progress?: number;
  reportId?: string;
  downloadUrl?: string;
  error?: string;
}

interface NotificationEventData {
  title: string;
  message: string;
  // FIX: Simplified to just `string` to remove redundant type constituents.
  type: string;
}

// Type guard to check if the data payload is for a general notification
function isNotificationData(data: unknown): data is NotificationEventData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'title' in data &&
    'message' in data
  );
}

// Type guard to check if the data payload is for a report status update
function isReportData(data: unknown): data is ReportEventData {
  return typeof data === 'object' && data !== null && 'status' in data;
}


// Simple button component to avoid import issues
function SimpleButton({
  children,
  onClick,
  disabled = false,
  className = "",
  variant = "default"
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  variant?: "default" | "ghost";
}) {
  const baseClasses = "px-4 py-2 rounded-md text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed";
  const variantClasses = variant === "ghost"
    ? "hover:bg-gray-700 text-gray-300"
    : "bg-blue-600 text-white hover:bg-blue-700";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses} ${className}`}
    >
      {children}
    </button>
  );
}

export default function SSEDemoPage() {
  const { connectionState, events, lastEvent } = useSSE();
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [notifications, setNotifications] = useState<SSEEventData[]>([]);

  // Debug logging
  useEffect(() => {
    console.log('SSE Demo - Connection State:', connectionState);
    console.log('SSE Demo - Events:', events);
    console.log('SSE Demo - Last Event:', lastEvent);
  }, [connectionState, events, lastEvent]);

  // Update notifications when new events arrive
  useEffect(() => {
    if (lastEvent) {
      setNotifications(prev => {
        const newNotifications = [...prev, lastEvent];
        return newNotifications.slice(-10); // Keep last 10
      });
    }
  }, [lastEvent]);

  const simulateReportGeneration = async () => {
    setIsGeneratingReport(true);

    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportType: 'demo',
          parameters: {
            dateRange: 'last-30-days',
            includeCharts: true,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start report generation');
      }

      // Apply the type to the parsed JSON response
      const result = await response.json() as ReportGenerationResult;
      console.log('Report generation started:', result.reportId);

      // Reset the button state after a delay (the SSE will handle the actual updates)
      setTimeout(() => {
        setIsGeneratingReport(false);
      }, 1000);
    } catch (error) {
      console.error('Error starting report generation:', error);
      setIsGeneratingReport(false);
    }
  };

  const sendTestNotification = async () => {
    try {
      const response = await fetch('/api/sse/test-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Test Notification',
          message: 'This is a test notification sent at ' + new Date().toLocaleTimeString(),
          type: 'info',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send notification');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  };

  const broadcastMessage = async () => {
    try {
      const response = await fetch('/api/sse/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: 'notification',
          data: {
            title: 'Broadcast Message',
            message: 'This message was broadcast to all connected clients at ' + new Date().toLocaleTimeString(),
            type: 'info',
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to broadcast message');
      }
    } catch (error) {
      console.error('Error broadcasting message:', error);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">SSE Demo</h1>
        <p className="text-gray-600">
          This page demonstrates the Server-Sent Events (SSE) functionality for real-time notifications.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Controls Panel */}
        <div className="space-y-6">
          <div className="bg-black p-6 rounded-lg border shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Test Controls</h2>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Connection Status</h3>
                <div className="flex items-center gap-2 p-3 rounded-lg">
                  <div className={`w-3 h-3 rounded-full ${
                    connectionState.isConnected ? 'bg-green-500' :
                    connectionState.isConnecting ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                  <span className="text-sm">
                    {connectionState.isConnected ? 'Connected' :
                      connectionState.isConnecting ? 'Connecting...' : 'Disconnected'}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">Actions</h3>
                <div className="space-y-2">
                  <SimpleButton
                    onClick={simulateReportGeneration}
                    disabled={isGeneratingReport}
                    className="w-full"
                  >
                    {isGeneratingReport ? 'Generating Report...' : 'Simulate Report Generation'}
                  </SimpleButton>

                  <SimpleButton
                    onClick={sendTestNotification}
                    className="w-full"
                  >
                    Send Test Notification
                  </SimpleButton>

                  <SimpleButton
                    onClick={broadcastMessage}
                    className="w-full"
                  >
                    Broadcast Message
                  </SimpleButton>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">Event Count</h3>
                <div className="text-2xl font-bold text-blue-600">
                  {events.length}
                </div>
                <p className="text-xs text-gray-500">Total events received</p>
              </div>
            </div>
          </div>

          <div className="bg-black p-6 rounded-lg border shadow-sm">
            <h2 className="text-xl font-semibold mb-4">How it Works</h2>
            <div className="space-y-3 text-sm text-gray-600">
              <div>
                <strong>1. Connection:</strong> The page automatically connects to the SSE endpoint when loaded.
              </div>
              <div>
                <strong>2. Real-time Updates:</strong> Events are pushed from the server to all connected clients.
              </div>
              <div>
                <strong>3. Report Generation:</strong> Simulates a long-running process with status updates.
              </div>
              <div>
                <strong>4. Notifications:</strong> Send targeted or broadcast messages to users.
              </div>
              <div>
                <strong>5. Auto-reconnect:</strong> The connection automatically reconnects if disconnected.
              </div>
            </div>
          </div>
        </div>

        {/* Notifications Panel */}
        <div className="bg-black p-6 rounded-lg border shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Real-time Notifications</h2>

          <div className="space-y-2">
            <div className="flex items-center justify-start">
              <h3 className="text-sm font-medium">Recent Notifications</h3>
            </div>

            <div className="space-y-2 max-h-[40rem] overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((notification, index) => {
                  // FIX: Explicitly type `data` as `unknown` to prevent unsafe assignment from `any`.
                  const data: unknown = notification.data;
                  return (
                    <div
                      key={`${notification.timestamp}-${index}`}
                      className="p-3 rounded-lg border text-sm bg-gray-800 border-gray-700"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-lg">
                          {notification.event === 'report.generating' ? '⏳' :
                           notification.event === 'report.completed' ? '✅' :
                           notification.event === 'report.failed' ? '❌' :
                           notification.event === 'notification' ? '📢' : 'ℹ️'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white">
                            {notification.event === 'report.generating' && 'Report Generation Started'}
                            {notification.event === 'report.completed' && 'Report Generation Completed'}
                            {notification.event === 'report.failed' && 'Report Generation Failed'}
                            {isNotificationData(data) && data.title}
                          </div>
                          <div className="text-xs opacity-75 mt-1 text-gray-300">
                            {isNotificationData(data)
                              ? data.message
                              : isReportData(data)
                              ? data.status
                              : null}
                          </div>
                          {isReportData(data) && typeof data.progress === 'number' && (
                            <div className="mt-2">
                              <div className="w-full bg-gray-600 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${data.progress}%` }}
                                />
                              </div>
                              <span className="text-xs mt-1 block text-gray-300">{data.progress}%</span>
                            </div>
                          )}
                          <div className="text-xs opacity-50 mt-1 text-gray-400">
                            {new Date(notification.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-2xl mb-2">📭</div>
                  <p className="text-sm">No notifications yet</p>
                  <p className="text-xs">Real-time updates will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Raw Events Log */}
      <div className="mt-8 bg-black p-6 rounded-lg border shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Raw Events Log</h2>
        <div className="bg-black p-4 rounded-lg max-h-64 overflow-y-auto">
          {events.length === 0 ? (
            <p className="text-gray-500 text-sm">No events received yet...</p>
          ) : (
            <div className="space-y-2">
              {events.map((event, index) => (
                <div key={index} className="text-xs font-mono bg-black p-2 rounded border">
                  <div className="text-blue-600 font-semibold">{event.event}</div>
                  <div className="text-gray-600">{new Date(event.timestamp).toLocaleTimeString()}</div>
                  <pre className="text-xs mt-1 overflow-x-auto">
                    {JSON.stringify(event.data, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
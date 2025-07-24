'use client';

import { useState } from 'react';
import { useSSE } from '../hooks/useSSEConnection';
import type { SSEEvent } from '../types';
import { Button } from '@/shared/components/ui/button';
import { api } from '@/trpc/react';

export function SSEClient() {
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [customMessage, setCustomMessage] = useState('Hello from SSE Demo!');
  const sender = api.sse.sendMessage.useMutation();

  const { id, isConnected, isConnecting, error, lastEvent, reconnectAttempts, connect, disconnect, reconnect } = useSSE({
    onMessage: (event) => {
      setEvents(prev => [...prev.slice(-9), event]); // Keep last 10 events
    },
  });

  const sendTestMessage = async () => {
    if (!id) {
      console.error('No client ID available');
      return;
    }

    setIsSending(true);
    try {
      sender.mutate({
        clientId: id,
        message: customMessage,
      });
    } catch (error) {
      console.error('Error sending test message:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">SSE Demo</h1>

      {/* Client ID Display */}
      {isConnected && id && (
        <div className="mb-6 p-4 border rounded-lg bg-green-50 shadow-sm">
          <h2 className="text-xl font-semibold mb-3 text-gray-900">Connected Client</h2>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span className="text-lg font-mono font-medium text-green-800">
              Client ID: {id}
            </span>
          </div>
        </div>
      )}

      <div className="mb-6 p-4 border rounded-lg bg-white shadow-sm">
        <h2 className="text-xl font-semibold mb-3 text-gray-900">Connection Status</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full ${isConnected ? 'bg-green-500' : isConnecting ? 'bg-yellow-500' : 'bg-red-500'}`} />
            <span className="text-base font-medium text-gray-800">
              Status: {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected'}
            </span>
          </div>
          {error && (
            <div className="text-red-700 font-medium text-base">
              Error: {error}
            </div>
          )}
          {reconnectAttempts > 0 && (
            <div className="text-amber-700 font-medium text-base">
              Reconnect attempts: {reconnectAttempts}
            </div>
          )}
        </div>

        <div className="mt-4 space-x-3">
          <Button
            onClick={connect}
            disabled={isConnected || isConnecting}
            variant="outline"
            className="text-black"
          >
            Connect
          </Button>
          <Button
            onClick={disconnect}
            disabled={!isConnected}
            variant="outline"
            className="text-black"
          >
            Disconnect
          </Button>
          <Button
            onClick={reconnect}
            disabled={isConnecting}
            variant="outline"
            className="text-black"
          >
            Reconnect
          </Button>
        </div>
      </div>

      {/* Test Controls */}
      <div className="mb-6 p-4 border rounded-lg bg-white shadow-sm">
        <h2 className="text-xl font-semibold mb-3 text-gray-900">Test Controls</h2>

        {/* Custom Message Input */}
        <div className="mb-4">
          <label htmlFor="customMessage" className="block text-sm font-medium text-gray-700 mb-2">
            Custom Message
          </label>
          <div className="flex gap-2">
            <input
              id="customMessage"
              type="text"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Enter your message here..."
              className="flex-1 text-black px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
            />
            <Button
              onClick={sendTestMessage}
              // disabled={!isConnected || isSending || !id || !customMessage.trim()}
              variant="default"
              className="text-base"
            >
              {isSending ? 'Sending...' : 'Send Message'}
            </Button>
          </div>
        </div>
      </div>

      {/* Latest Event */}
      {lastEvent && (
        <div className="mb-6 p-4 border rounded-lg bg-blue-50 shadow-sm">
          <h2 className="text-xl font-semibold mb-3 text-gray-900">Latest Event</h2>
          <div className="bg-white p-4 rounded border">
            <div className="font-mono text-base">
              <div className="mb-2"><strong className="text-gray-900">Event:</strong> <span className="text-blue-700">{lastEvent.event}</span></div>
              <div className="mb-2"><strong className="text-gray-900">Data:</strong></div>
              <pre className="mt-2 p-3 bg-gray-100 rounded text-sm overflow-auto border text-gray-800">
                {JSON.stringify(lastEvent.data, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Event History */}
      {events.length > 0 && (
        <div className="p-4 border rounded-lg bg-white shadow-sm">
          <h2 className="text-xl font-semibold mb-3 text-gray-900">Event History (Last 10)</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {events.map((event, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded border">
                <div className="font-mono text-base">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-900">{event.event}</span>
                    <span className="text-sm text-gray-600 font-medium">
                      {new Date((event.data as { timestamp?: number })?.timestamp ?? Date.now()).toLocaleTimeString()}
                    </span>
                  </div>
                  <pre className="text-sm overflow-auto text-gray-800 bg-white p-3 rounded border">
                    {JSON.stringify(event.data, null, 2)}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 
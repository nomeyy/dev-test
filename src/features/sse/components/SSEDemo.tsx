'use client';

import { useState, useEffect } from 'react';
import { useSSE } from '../hooks/useSSE';
import { Button } from '../../shared/components/ui/button';

interface SSEDemoProps {
  userId?: string;
  sessionId?: string;
}

export function SSEDemo({ userId = 'full-demo-user', sessionId = 'demo-session' }: SSEDemoProps) {
  const [messages, setMessages] = useState<Array<{
    id: string;
    event: string;
    data: any;
    timestamp: Date;
  }>>([]);
  
  const [connectionInfo, setConnectionInfo] = useState<{
    clientId?: string;
    connectedAt?: Date;
  }>({});

  const { 
    state, 
    isConnected, 
    lastMessage, 
    error, 
    connect, 
    disconnect, 
    addEventListener 
  } = useSSE('/api/sse', {
    userId,
    sessionId,
    autoConnect: false,
    reconnect: true,
    maxReconnectAttempts: 3,
  });

  // Handle connection events
  useEffect(() => {
    addEventListener('connected', (data) => {
      setConnectionInfo({
        clientId: data.clientId,
        connectedAt: new Date(data.connectedAt),
      });
    });

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
  }, [isConnected , addEventListener]);

  // Add new messages to the list
  useEffect(() => {
    if (lastMessage) {
      setMessages(prev => [
        {
          id: `${Date.now()}-${Math.random()}`,
          event: lastMessage.event,
          data: lastMessage.data,
          timestamp: lastMessage.timestamp,
        },
        ...prev.slice(0, 19) // Keep only last 20 messages
      ]);
    }
  }, [lastMessage]);

  const sendTestMessage = async (event: string, data: any, target?: { userId?: string; sessionId?: string }) => {
    try {
      const payload = {
        event,
        data,
        ...(target?.userId && { targetUserId: target.userId }),
        ...(target?.sessionId && { targetSessionId: target.sessionId }),
      };

      const response = await fetch('/api/sse/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const result = await response.json();
      console.log('Message sent:', result);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const getConnectionColor = () => {
    switch (state) {
      case 'connected': return 'text-green-600';
      case 'connecting': return 'text-yellow-600';
      case 'reconnecting': return 'text-orange-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 text-black">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4 text-black">SSE Demo</h2>
        
        {/* Connection Status */}
        <div className="bg-gray-50 rounded p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-black">Connection Status</h3>
            <span className={`font-medium ${getConnectionColor()}`}>
              {state.toUpperCase()}
            </span>
          </div>
          
          {connectionInfo.clientId && (
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Client ID:</strong> {connectionInfo.clientId}</p>
              <p><strong>User ID:</strong> {userId}</p>
              <p><strong>Session ID:</strong> {sessionId}</p>
              {connectionInfo.connectedAt && (
                <p><strong>Connected At:</strong> {connectionInfo.connectedAt.toLocaleString()}</p>
              )}
            </div>
          )}
          
          {error && (
            <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
              Error: {error.message}
            </div>
          )}
        </div>

        {/* Connection Controls */}
        <div className="flex gap-2 mb-4">
          <Button 
            onClick={connect} 
            disabled={isConnected}
            variant={isConnected ? "secondary" : "default"}
          >
            Connect
          </Button>
          <Button 
            onClick={disconnect} 
            disabled={!isConnected}
            variant="destructive"
          >
            Disconnect
          </Button>
        </div>

        {/* Test Message Buttons */}
        <div className="space-y-2 mb-6">
          <h3 className="font-semibold text-black">Send Test Messages</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button
              onClick={() => sendTestMessage('test-event', { message: 'Hello from SSE!', type: 'test' })}
              disabled={!isConnected}
              variant="outline"
              size="sm"
            >
              Test Event
            </Button>
            
            <Button
              onClick={() => sendTestMessage('notification', { 
                title: 'New Notification', 
                message: 'You have a new notification!',
                type: 'info' 
              }, { userId })}
              disabled={!isConnected}
              variant="outline"
              size="sm"
            >
              User Notification
            </Button>
            
            <Button
              onClick={() => sendTestMessage('system-notification', {
                message: 'System maintenance in 10 minutes',
                type: 'warning'
              })}
              disabled={!isConnected}
              variant="outline"
              size="sm"
            >
              Broadcast
            </Button>
            
            <Button
              onClick={() => sendTestMessage('user-action', {
                action: 'like',
                actor: { id: 'other-user', name: 'John Doe' },
                resource: { type: 'post', id: '123', title: 'My awesome post' }
              }, { userId })}
              disabled={!isConnected}
              variant="outline"
              size="sm"
            >
              User Action
            </Button>
          </div>
        </div>

        {/* Messages Display */}
        <div className="space-y-2">
          <h3 className="font-semibold text-black">Recent Messages ({messages.length})</h3>
          <div className="bg-gray-50 rounded p-4 max-h-96 overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No messages received yet</p>
            ) : (
              <div className="space-y-2">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className="bg-white p-3 rounded border text-sm"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-blue-600">{message.event}</span>
                      <span className="text-gray-400 text-xs">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <pre className="text-gray-700 whitespace-pre-wrap text-xs">
                      {JSON.stringify(message.data, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
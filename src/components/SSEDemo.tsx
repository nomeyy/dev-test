'use client';

import { useState } from 'react';
import { useSSE } from '@/hooks/useSSE';

export default function SimpleSSEDemo() {
  const [userId] = useState('user123');
  const sse = useSSE({ userId, enableLogging: true });

  const sendNotification = async () => {
    try {
      const response = await fetch('/api/demo/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          title: 'Test Notification',
          message: `Message sent at ${new Date().toLocaleTimeString()}`,
          type: 'info',
        }),
      });

      if (!response.ok) {
        console.error('Failed to send notification');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>SSE Demo</h1>
      
      {/* Connection Status */}
      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
        <strong>Connection Status:</strong> {sse.isConnected ? '✅ Connected' : '❌ Disconnected'}
        {sse.error && <div style={{ color: 'red', marginTop: '5px' }}>Error: {sse.error}</div>}
      </div>

      {/* Button to send notification */}
      <button 
        onClick={sendNotification}
        style={{
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '16px',
          marginBottom: '20px'
        }}
      >
        Send Test Notification
      </button>

      {/* show latest SSE message */}
      <div style={{ 
        padding: '15px', 
        backgroundColor: '#f8f9fa', 
        border: '1px solid #dee2e6', 
        borderRadius: '5px',
        minHeight: '100px'
      }}>
        <strong>Latest SSE Message:</strong>
        {sse.lastMessage ? (
          <div style={{ marginTop: '10px' }}>
            <div><strong>Type:</strong> {sse.lastMessage.type}</div>
            <div><strong>Time:</strong> {sse.lastMessage.timestamp}</div>
            <div><strong>Data:</strong></div>
            <pre style={{ 
              backgroundColor: '#e9ecef', 
              padding: '10px', 
              borderRadius: '3px',
              marginTop: '5px',
              fontSize: '14px',
              overflow: 'auto'
            }}>
              {JSON.stringify(sse.lastMessage.data, null, 2)}
            </pre>
          </div>
        ) : (
          <div style={{ color: '#6c757d', marginTop: '10px' }}>
            No messages
          </div>
        )}
      </div>
    </div>
  );
}
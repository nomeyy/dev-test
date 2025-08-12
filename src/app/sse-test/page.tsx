"use client";

import React from 'react';
import { useSSE } from '@/features/sse';

export default function SSETestPage() {
  const { isConnected, isConnecting, events, error, connect, disconnect } = useSSE();

  const triggerTest = async () => {
    try {
      const response = await fetch('/api/sse/trigger-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'test',
          data: { 
            message: 'Test from simple page', 
            timestamp: new Date().toISOString(),
            random: Math.random()
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('Test triggered:', result);
    } catch (error) {
      console.error('Error triggering test:', error);
      alert(`Error: ${String(error)}`);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Simple SSE Test (Using useSSE Hook)</h1>
      
      <div>
        <strong>Connection Status:</strong> 
        <span style={{ color: isConnected ? 'green' : (isConnecting ? 'orange' : 'red') }}>
          {isConnected ? ' Connected' : (isConnecting ? ' Connecting...' : ' Disconnected')}
        </span>
      </div>

      {error && (
        <div style={{ color: 'red', margin: '10px 0' }}>
          <strong>Error:</strong> {error instanceof Event ? 'An SSE error occurred' : 'Error'}
        </div>
      )}

      <div style={{ margin: '20px 0' }}>
        <button onClick={triggerTest} disabled={!isConnected} style={{ marginRight: '10px' }}>
          Trigger Test Event
        </button>
        <button onClick={connect} disabled={isConnected || isConnecting}>
          Connect
        </button>
        <button onClick={disconnect} disabled={!isConnected}>
          Disconnect
        </button>
      </div>

      <div>
        <h3>Events ({events.length}):</h3>
        <div style={{ 
          border: '1px solid #ccc', 
          padding: '10px', 
          height: '300px', 
          overflow: 'auto',
          backgroundColor: '#f5f5f5'
        }}>
          {events.length === 0 ? (
            <div style={{ color: '#888' }}>No events yet...</div>
          ) : (
            events.map((event, index) => (
              <div key={index} style={{ marginBottom: '5px', fontSize: '12px' }}>
                <strong>{event.event}:</strong> {JSON.stringify(event.data)}
                <br />
                <small style={{ color: '#666' }}>{event.timestamp.toLocaleTimeString()}</small>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        <p>This page uses the useSSE hook from @/features/sse</p>
        <p>Open DevTools Console (F12) to see detailed logs</p>
        <p>Visit: <code>http://localhost:3000/sse-test</code></p>
      </div>
    </div>
  );
}
"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useSSE } from '@/features/sse';

export default function ClientPage() {
  const [clientId, setClientId] = useState('');
  const queryClientId = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('clientId') ?? '';
  }, []);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('client.clientId') ?? '' : '';
    const base = queryClientId ?? stored ?? `cli-${Math.random().toString(36).slice(2, 10)}`;
    setClientId(base);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('client.clientId', base);
    }
  }, [queryClientId]);

  const streamUrl = useMemo(() => {
    const params = new URLSearchParams({ clientId, role: 'client' });
    return `/api/sse?${params.toString()}`;
  }, [clientId]);

  const { isConnected, isConnecting, events, error, connect, disconnect } = useSSE({ url: streamUrl, autoReconnect: false, connectOnMount: false });

  const [serverId, setServerId] = useState('');
  const [connectionId, setConnectionId] = useState('');
  useEffect(() => {
    const last = events[events.length - 1];
    if (last?.event === 'connected' && (last as any).data?.serverId) {
      setServerId(String((last as any).data.serverId));
      if ((last as any).data?.connectionId) {
        setConnectionId(String((last as any).data.connectionId));
      }
    }
  }, [events]);

  const badgeStyle = {
    base: {
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 999,
      fontSize: 12,
      border: '1px solid',
    },
    connected: { color: '#0b5', borderColor: '#0b5', background: '#eafff3' },
    connecting: { color: '#c80', borderColor: '#c80', background: '#fff6e6' },
    disconnected: { color: '#c22', borderColor: '#c22', background: '#ffecec' },
  } as const;

  const statusBadge = (
    <span
      style={{
        ...badgeStyle.base,
        ...(isConnected ? badgeStyle.connected : isConnecting ? badgeStyle.connecting : badgeStyle.disconnected),
      }}
      title={
        isConnected
          ? `SSE connected — Server ID: ${serverId || '…'} — Client ID: ${clientId}`
          : isConnecting
            ? 'Attempting to open SSE connection…'
            : 'No SSE connection is currently open'
      }
    >
      {isConnected ? 'Connected' : isConnecting ? 'Connecting…' : 'Disconnected'}
    </span>
  );

  const buttonBase: React.CSSProperties = {
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid transparent',
    cursor: 'pointer',
    fontWeight: 600,
    fontFamily: 'inherit',
  };

  return (
    <div style={{ padding: 20, fontFamily: 'Inter, ui-sans-serif, system-ui, monospace' }}>
      <h1 style={{ marginTop: 0 }}>Client</h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {statusBadge}
        <span style={{ color: '#555' }}>
          {isConnected
            ? `Connected to server: ${serverId || '…'} — Client ID: ${clientId} — Connection ID: ${connectionId || '…'}`
            : `Client ID: ${clientId}`}
        </span>
      </div>

      {error && (
        <div style={{ color: '#b00', marginTop: 8, fontSize: 13 }}>
          Error: {error instanceof Event ? 'An SSE error occurred' : String(error)}
        </div>
      )}

      <div style={{ margin: '14px 0', display: 'flex', gap: 8 }}>
        <button
          onClick={connect}
          disabled={isConnected || isConnecting}
          style={{
            ...buttonBase,
            background: isConnected || isConnecting ? '#d7f5e5' : '#12b76a',
            color: isConnected || isConnecting ? '#1a7f55' : '#fff',
          }}
          title={`Open SSE connection to server using Client ID: ${clientId}`}
        >
          Connect
        </button>
        <button
          onClick={disconnect}
          disabled={!isConnected}
          style={{
            ...buttonBase,
            background: !isConnected ? '#ffdede' : '#ef4444',
            color: !isConnected ? '#a12' : '#fff',
          }}
          title="Close the SSE connection for this tab"
        >
          Disconnect
        </button>
      </div>

      <div>
        <h3 style={{ marginBottom: 8 }}>Events ({events.length})</h3>
        <div
          style={{ border: '1px solid #e5e7eb', background: '#fafafa', padding: 10, height: 260, overflow: 'auto', borderRadius: 6 }}
          title="Incoming Server-Sent Events for this tab"
        >
          {events.map((e, i) => (
            <div key={i} style={{ fontSize: 12, marginBottom: 6 }}>
              <strong>{e.event}:</strong> {JSON.stringify(e.data)}
              <br />
              <small style={{ color: '#666' }}>{e.timestamp.toLocaleTimeString()}</small>
            </div>
          ))}
          {events.length === 0 && <div style={{ color: '#888' }}>No events yet…</div>}
        </div>
      </div>
    </div>
  );
}



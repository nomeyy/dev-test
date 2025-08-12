"use client";

import React, { useEffect, useState } from 'react';

export default function ServerPage() {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedConnectionId, setSelectedConnectionId] = useState('');

  return (
    <div style={{ padding: 20, fontFamily: 'Inter, ui-sans-serif, system-ui, monospace' }}>
      <h1 style={{ marginTop: 0 }}>Server</h1>
      <ConnectedClients
        onPickClientId={(id) => setSelectedClientId(id)}
        onPickConnectionId={(id) => setSelectedConnectionId(id)}
      />
      <SendControls
        selectedClientId={selectedClientId}
        setSelectedClientId={setSelectedClientId}
        selectedConnectionId={selectedConnectionId}
        setSelectedConnectionId={setSelectedConnectionId}
      />
    </div>
  );
}

function ConnectedClients({ onPickClientId, onPickConnectionId }: { onPickClientId: (id: string) => void; onPickConnectionId: (id: string) => void; }) {
  const [clients, setClients] = useState<Array<{ connectionId: string; clientId: string; userId?: string; role?: string; connectedAt: string; lastActivity: string; isAlive: boolean }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [onlyOpenTab, setOnlyOpenTab] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchClients = async () => {
      try {
        const res = await fetch('/api/sse/clients', { cache: 'no-store', headers: { 'pragma': 'no-cache', 'cache-control': 'no-cache' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!mounted) return;
        const list = (data.clients ?? []) as typeof clients;
        // If onlyOpenTab is enabled, filter by this window's known clientId by reading the stream request if connected
        // Since we don't store remote ids here, we just show all or let the user toggle.
        setClients(onlyOpenTab ? list : list);
        setError(null);
        console.log('[SSE:ServerUI] fetched clients', data);
      } catch (e) {
        if (!mounted) return;
        setError(String(e));
        console.error('[SSE:ServerUI] failed to fetch clients', e);
      }
    };
    void fetchClients();
    const id = setInterval(() => { void fetchClients(); }, 2000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [onlyOpenTab]);

  return (
    <div style={{ marginTop: 20 }}>
      <h2 style={{ margin: 0 }} title="All SSE client connections currently registered on the server">Connected Clients</h2>
      <div style={{ marginTop: 8 }}>
        <label style={{ fontSize: 13, color: '#444' }}>
          <input type="checkbox" checked={onlyOpenTab} onChange={(e) => setOnlyOpenTab(e.target.checked)} style={{ marginRight: 6 }} />
          Show only this tab&apos;s connection (if identifiable)
        </label>
      </div>
      {error && <div style={{ color: '#b00', fontSize: 13, marginTop: 6 }}>Error: {error}</div>}
      <div style={{ marginTop: 10, border: '1px solid #e5e7eb', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 0.7fr 0.8fr 0.9fr', fontWeight: 600, fontSize: 13, background: '#f3f4f6', padding: '8px 10px' }} title="Live list, refreshing every 3s">
          <div>Connection ID</div>
          <div>Client ID</div>
          <div>User</div>
          <div>Role</div>
          <div>Last Activity</div>
        </div>
        <div>
          {clients.length === 0 && (
            <div style={{ padding: 10, color: '#888', fontSize: 13 }}>No connected clients</div>
          )}
          {clients.map((c) => (
            <div key={c.connectionId} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 0.7fr 0.8fr 0.9fr', padding: '8px 10px', borderTop: '1px solid #eee', fontSize: 13 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'monospace' }} title="Click to copy" onClick={() => navigator.clipboard.writeText(c.connectionId)}>{c.connectionId}</span>
                <button title="Use this connectionId in Send form" onClick={() => { onPickConnectionId(c.connectionId); onPickClientId(c.clientId); }} style={{ padding: '2px 6px', borderRadius: 4, border: '1px solid #ddd', cursor: 'pointer' }}>Use</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'monospace' }} title="Click to copy" onClick={() => navigator.clipboard.writeText(c.clientId)}>{c.clientId}</span>
                <button title="Use this clientId in Send form" onClick={() => { onPickClientId(c.clientId); onPickConnectionId(c.connectionId); }} style={{ padding: '2px 6px', borderRadius: 4, border: '1px solid #ddd', cursor: 'pointer' }}>Use</button>
              </div>
              <div>{c.userId || '—'}</div>
              <div>{c.role || '—'}</div>
              <div>{new Date(c.lastActivity).toLocaleTimeString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SendControls({ selectedClientId, setSelectedClientId, selectedConnectionId, setSelectedConnectionId }: { selectedClientId: string; setSelectedClientId: (s: string) => void; selectedConnectionId: string; setSelectedConnectionId: (s: string) => void; }) {
  const [clientId, setClientId] = useState(selectedClientId);
  const [connectionId, setConnectionId] = useState(selectedConnectionId);
  const [eventName, setEventName] = useState('test');
  const [payload, setPayload] = useState('{"message":"hello"}');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const tryParse = (s: string): unknown => {
    try { return JSON.parse(s) as unknown; } catch { return s as unknown; }
  };

  // Sync external selections into local inputs
  useEffect(() => { setClientId(selectedClientId); }, [selectedClientId]);
  useEffect(() => { setConnectionId(selectedConnectionId); }, [selectedConnectionId]);

  const sendToClient = async () => {
    setBusy(true); setResult(null);
    try {
      // Build fresh target each time to avoid stale state reuse
      const body: any = { event: eventName, data: tryParse(payload) };
      if (connectionId) { body.connectionId = connectionId; }
      else if (clientId) { body.clientId = clientId; }
      const res = await fetch('/api/sse/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) {
        console.error('[SSE:ServerUI] send_to_client_error_response', data);
        setResult({ kind: 'error', text: data?.message || data?.error || `HTTP ${res.status}` });
        return;
      }
      console.log('[SSE:ServerUI] send_to_client', data);
      setResult({ kind: 'ok', text: `Sent: ${data.sent}` });
      // Clear IDs on success to prevent accidental re-targeting
      setClientId('');
      setConnectionId('');
      setSelectedClientId('');
      setSelectedConnectionId('');
    } catch (e) {
      console.error('[SSE:ServerUI] send_to_client_error', e);
      setResult({ kind: 'error', text: String(e) });
    } finally { setBusy(false); }
  };

  const broadcast = async () => {
    setBusy(true); setResult(null);
    try {
      const res = await fetch('/api/sse/broadcast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: eventName, data: tryParse(payload) }) });
      const data = await res.json();
      console.log('[SSE:ServerUI] broadcast', data);
      setResult({ kind: 'ok', text: `Broadcast to: ${data.sent}` });
    } catch (e) {
      console.error('[SSE:ServerUI] broadcast_error', e);
      setResult({ kind: 'error', text: String(e) });
    } finally { setBusy(false); }
  };

  const labelStyle: React.CSSProperties = { fontSize: 12, color: '#555', marginTop: 10, display: 'block' };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #e5e7eb', fontFamily: 'monospace' };

  // Auto-hide result after a few seconds
  useEffect(() => {
    if (!result) return;
    const id = setTimeout(() => setResult(null), 4000);
    return () => clearTimeout(id);
  }, [result]);

  return (
    <div style={{ marginTop: 24 }}>
      <h2 style={{ margin: 0 }}>Send Events</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10 }}>
        <div>
          <label style={labelStyle} title="Target clientId for direct send">Client ID</label>
          <input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="cli-..." style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle} title="Target a specific connectionId (overrides clientId if provided)">Connection ID</label>
          <input value={connectionId} onChange={(e) => setConnectionId(e.target.value)} placeholder="con-..." style={inputStyle} />
        </div>
        {connectionId && !connectionId.startsWith('con-') && !clientId && (
          <div style={{ gridColumn: '1 / span 2', color: '#991b1b', fontSize: 12 }}>
            This looks like a Client ID. Put it in the Client ID field, or paste a Connection ID (starts with &quot;con-&quot;).
          </div>
        )}
        <div>
          <label style={labelStyle} title="Event name delivered to clients">Event</label>
          <input value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="event.name" style={inputStyle} />
        </div>
        <div style={{ gridColumn: '1 / span 2' }}>
          <label style={labelStyle} title="JSON payload. If invalid JSON, it will be sent as a string.">Payload</label>
          <textarea value={payload} onChange={(e) => setPayload(e.target.value)} rows={4} style={{ ...inputStyle, fontFamily: 'monospace' }} />
        </div>
      </div>
      <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
        <button disabled={(!clientId && !connectionId) || busy} onClick={sendToClient} title="Send to the specified clientId or a specific connectionId" style={{ padding: '8px 12px', borderRadius: 6, background: (!clientId && !connectionId) || busy ? '#ddd' : '#2563eb', color: '#fff', border: 0, cursor: (!clientId && !connectionId) || busy ? 'not-allowed' : 'pointer' }}>Send to Client</button>
        <button disabled={busy} onClick={broadcast} title="Send this event to all connected clients" style={{ padding: '8px 12px', borderRadius: 6, background: busy ? '#ddd' : '#7c3aed', color: '#fff', border: 0, cursor: busy ? 'not-allowed' : 'pointer' }}>Broadcast</button>
      </div>
      {result && (
        <div
          role="alert"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: 16,
            right: 16,
            maxWidth: 360,
            zIndex: 2147483647,
            padding: '10px 12px',
            borderRadius: 8,
            boxShadow: '0 6px 18px rgba(0,0,0,0.15)',
            background: result.kind === 'ok' ? '#0ea5e9' : '#ef4444',
            color: '#fff',
            fontSize: 13,
          }}
          title={result.kind === 'ok' ? 'Notification' : 'Error'}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontWeight: 700 }}>{result.kind === 'ok' ? 'Success' : 'Error'}</span>
            <span style={{ opacity: 0.9 }}>{result.text}</span>
            <button
              onClick={() => setResult(null)}
              style={{ marginLeft: 'auto', background: 'transparent', border: 0, color: '#fff', cursor: 'pointer' }}
              aria-label="Dismiss notification"
              title="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}



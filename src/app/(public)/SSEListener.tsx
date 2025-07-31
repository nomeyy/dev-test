'use client';
import { useState } from 'react';

const SSEListener = ({ clientId }: { clientId: string }) => {
    const [latestMessage, setLatestMessage] = useState<string | null>(null);
    const [connected, setConnected] = useState<boolean>(false);
    const [eventSource, setEventSource] = useState<EventSource | null>(null);
    const [err, setErr] = useState<any>(null);

    const handleConnect = () => {
        if (!clientId || eventSource) return;

        const es = new EventSource(`/api/sse?clientId=${clientId}`);

        es.onopen = () => {
            console.log('✅ Connected to SSE server');
            setConnected(true);
        };

        es.onerror = (err) => {
            console.error('❌ SSE error:', err);
            setErr(JSON.stringify(err));
            // es.close();
            // setConnected(false);
            // setEventSource(null);
        };

        es.addEventListener('connected', (event) => {
            const data = JSON.parse(event.data);
            console.log('🟢 Connected event:', data);
        });

        es.addEventListener('notification', (event) => {
            const data = JSON.parse(event.data);
            console.log('🔔 Notification event:', data);
            setLatestMessage(data.message);
        });

        setEventSource(es);
    };

    const handleDisconnect = () => {
        if (eventSource) {
            eventSource.close();
            setConnected(false);
            setEventSource(null);
            console.log('🛑 Disconnected from SSE');
        }
    };

    return (
        <div>
            <button
                onClick={connected ? handleDisconnect : handleConnect}
                className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
            >
                {connected ? 'Disconnect' : 'Connect'}
            </button>

            <h2>📩 Latest SSE Message:</h2>
            <p>{latestMessage || 'Waiting for messages...'}</p>
            <p>Error : {err}</p>
        </div>
    );
};

export default SSEListener;

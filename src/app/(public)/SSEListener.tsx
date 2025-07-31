'use client';
import { useState } from 'react';

const SSEListener = ({ clientId }: { clientId: string }) => {
    const [latestMessage, setLatestMessage] = useState<string | null>(null); // Holds the latest message received
    const [connected, setConnected] = useState<boolean>(false); // Indicates connection status
    const [eventSource, setEventSource] = useState<EventSource | null>(null); // Holds the EventSource instance
    const [err, setErr] = useState<any>(null); // Stores any error from the SSE connection

    // Establishes a connection to the SSE server
    const handleConnect = () => {
        if (!clientId || eventSource) return;

        const es = new EventSource(`/api/sse?clientId=${clientId}`);

        // Called when the connection to the server is successfully established
        es.onopen = () => {
            console.log('Connected to SSE server');
            setConnected(true);
        };

        // Handles connection errors
        es.onerror = (err) => {
            setErr(JSON.stringify(err));
        };

        // Handles initial connection confirmation event
        es.addEventListener('connected', (event) => {
            const data = JSON.parse(event.data);
            console.log('Connected event:', data);
        });

        // Handles custom "notification" events from the server
        es.addEventListener('notification', (event) => {
            const data = JSON.parse(event.data);
            console.log('Notification event:', data);
            setLatestMessage(data.message);
        });

        setEventSource(es);
    };

    // Closes the SSE connection and resets relevant state
    const handleDisconnect = () => {
        if (eventSource) {
            eventSource.close();
            setConnected(false);
            setEventSource(null);
            console.log('Disconnected from SSE');
        }
    };

    return (
        <div>
            <button
                onClick={connected ? handleDisconnect : handleConnect}
                className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
            >
                {connected ? 'Disconnect' : 'Initialize connection'}
            </button>

            <h2>Latest SSE Message:</h2>
            <p>{latestMessage || 'Waiting for messages...'}</p>
            <p>Error: {err}</p>
        </div>
    );
};

export default SSEListener;

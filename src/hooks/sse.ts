'use client';

import { useEffect, useState } from 'react';

export type LogEntry = {
    type: 'notification' | 'heartbeat' | 'default';
    timestamp: string; 
    content: string;
};

export function useSSE(userId: string) {
    const [logs, setLogs] = useState<LogEntry[]>([])

    useEffect(() => {
        if (!userId) return

        const eventSource = new EventSource(`/api/sse?userId=${userId}`)

        const appendLog = (entry: LogEntry) => {
            setLogs((prev) => [entry, ...prev.slice(0, 49)])
        }

        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data)
            appendLog({
                type: 'default',
                timestamp: new Date().toISOString(),
                content: JSON.stringify(data),
            })
        }

        eventSource.addEventListener('ping', (event) => {
            appendLog({
                type: 'heartbeat',
                timestamp: new Date().toISOString(),
                content: `Ping`,
            })
        })

        eventSource.addEventListener('notification', (event) => {
            debugger
            console.log('📨 Received notification:', event.data);
            const data = JSON.parse(event.data);
            appendLog({
                type: 'notification',
                timestamp: new Date().toISOString(),
                content: data.message,
            });
        });

        eventSource.onerror = (err) => {
            console.error('SSE error:', err)
            eventSource.close()
        }

        return () => {
            eventSource.close()
        }
    }, [userId])

    return logs
}


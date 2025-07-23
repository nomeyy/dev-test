'use client';

import { useEffect, useState } from 'react';
import type { LogEntry } from '../hooks/sse';
import { useSSE } from '../hooks/sse';

function timeAgo(dateStr: string): string {
    const now = new Date();
    const past = new Date(dateStr);
    const diffMs = now.getTime() - past.getTime();
    const seconds = Math.floor(diffMs / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export default function NotificationPanel() {
    const [userId, setUserId] = useState('');
    const logs = useSSE(userId);
    const [customMessage, setCustomMessage] = useState('');

    useEffect(() => {
        let savedId = localStorage.getItem('userId');
        if (!savedId) {
            savedId = crypto.randomUUID();
            localStorage.setItem('userId', savedId);
        }
        setUserId(savedId);
    }, []);


    const sendMessage = async () => {
        if (!customMessage.trim()) return;

        await fetch('/api/notify', {
            method: 'POST',
            body: JSON.stringify({
                userId,
                event: 'notification',
                payload: { message: customMessage },
            }),
            headers: { 'Content-Type': 'application/json' },
        });

        setCustomMessage('');
    };

    return (
        <main className="flex items-center justify-center p-4">
            <div className="w-full max-w-xl p-6 space-y-6">
                <h1 className="text-2xl font-bold text-center">Real-Time Notifications</h1>

                <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                        <input
                            value={customMessage}
                            onChange={(e) => setCustomMessage(e.target.value)}
                            placeholder="Enter custom message"
                            className="flex-1 border rounded px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        <button
                            onClick={sendMessage}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded transition"
                        >
                            Send
                        </button>
                    </div>

                    <button
                        onClick={async () => {
                            await fetch('/api/notify', {
                                method: 'POST',
                                body: JSON.stringify({
                                    userId,
                                    event: 'notification',
                                    payload: { message: 'This is a server notification' }
                                }),
                                headers: { 'Content-Type': 'application/json' },
                            });
                        }}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded transition"
                    >
                        Send Server Notification
                    </button>

                </div>

                <div className="border rounded-lg bg-gray-50 max-h-96 overflow-auto p-4 text-sm font-mono text-gray-700 space-y-2">
                    {logs.length === 0 ? (
                        <p className="text-gray-400 italic text-center">No messages received yet.</p>
                    ) : (
                        logs.map((log: LogEntry, index: number) => (
                            <div key={index} className="flex justify-between">
                                <span
                                    className={`${log.type === 'heartbeat'
                                        ? 'text-blue-500'
                                        : log.type === 'notification'
                                            ? 'text-green-600'
                                            : 'text-gray-600'
                                        }`}
                                >
                                    [{timeAgo(log.timestamp)}] {log.type.toUpperCase()}:
                                </span>
                                <span className="ml-2 text-right truncate">{log.content}</span>
                            </div>
                        ))
                    )}
                </div>

                <p className="text-xs text-gray-400 text-center">
                    Connected as <strong>{userId || '...'}</strong>
                </p>
            </div>
        </main>
    );
}

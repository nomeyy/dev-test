'use client';

import { useEffect, useState } from 'react';

type Stats = {
  users: number;
  connections: number;
  log: string[];
};

export default function SseDashboardComponent({userId}: { userId: string }) {
  const [messages, setMessages] = useState<string[]>([]);
  const [stats, setStats] = useState<Stats>({ users: 0, connections: 0, log: [] });
  const [clientId, setClientId] = useState('');

  useEffect(() => {
    const eventSource = new EventSource(`/api/sse?userId=${userId}`);

    eventSource.addEventListener('clientId', (event) => {
      setClientId((event as MessageEvent).data);
    });

    eventSource.addEventListener('notification', (event) => {
      const msg = (event as MessageEvent).data;
      setMessages((prev) => [...prev, msg]);
    });

    eventSource.addEventListener('ping', (event) => {
      console.log('Ping received:', (event));
    });

    eventSource.addEventListener('stats', (event) => {
      console.log('Received stats:', event);
      const data = JSON.parse((event as MessageEvent).data);
      setStats(data);
    });

    return () => eventSource.close();
  }, [userId]);

  const sendToMe = async () =>
    fetch('/api/send-test', {
      method: 'POST',
      body: JSON.stringify({ userId }),
      headers: { 'Content-Type': 'application/json' },
    });

  const broadcast = async () =>
    fetch('/api/send-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      {/* Notifications */}
      <div className="border p-4 rounded">
        <h2 className="text-xl font-bold mb-2 flex items-center justify-between">
          Real-Time Notifications <span className="text-green-600">Connected</span>
        </h2>
        <div className="flex gap-2 mb-2">
          <button
            onClick={sendToMe}
            className="bg-blue-500 text-white px-2 py-1 rounded"
          >
            Send to Me
          </button>
          <button
            onClick={broadcast}
            className="bg-green-500 text-white px-2 py-1 rounded"
          >
            Broadcast to All
          </button>
          <button
            onClick={() => setMessages([])}
            className="bg-gray-500 text-white px-2 py-1 rounded"
          >
            Clear Messages
          </button>
        </div>
        <h3 className="font-semibold">Received Messages</h3>
        <ul className="h-40 overflow-auto border p-2 mt-2">
          {messages.map((msg, i) => (
            <li key={i}>{msg}</li>
          ))}
        </ul>
      </div>

      {/* Server Stats */}
      <div className="border p-4 rounded">
        <h2 className="text-xl font-bold mb-2">Server Stats</h2>
        <p>
          <strong>Users:</strong> {stats.users}
        </p>
        <p>
          <strong>Connections:</strong> {stats.connections}
        </p>
        <h3 className="font-semibold mt-2">Event Log</h3>
        <ul className="h-40 overflow-auto border p-2 mt-2">
          {stats.log.map((log, i) => (
            <li key={i}>{log}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
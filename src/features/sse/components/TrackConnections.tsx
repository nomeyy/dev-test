"use client";

import { useState, useEffect } from "react";

interface Client {
  id: string;
  userId?: string;
  sessionId?: string;
  connectedAt: number;
  lastPing: number;
  metadata?: Record<string, string>;
}

interface ConnectionStats {
  totalClients: number;
  clientsByUser: Record<string, number>;
  averageConnectionDuration: number;
  totalEventsSent: number;
  lastEventTime?: number;
}

export function TrackConnections() {
  const [stats, setStats] = useState<ConnectionStats | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/sse/clients");
        if (!response.ok) throw new Error("Failed to fetch connection stats");
        const clients: Client[] = await response.json();

        // Calculate stats from client data
        const clientsByUser: Record<string, number> = {};
        let totalConnectionDuration = 0;
        const now = Date.now();

        clients.forEach((client) => {
          if (client.userId) {
            clientsByUser[client.userId] =
              (clientsByUser[client.userId] || 0) + 1;
          }
          totalConnectionDuration += now - client.connectedAt;
        });

        setClients(clients);
        setStats({
          totalClients: clients.length,
          clientsByUser,
          averageConnectionDuration:
            clients.length > 0 ? totalConnectionDuration / clients.length : 0,
          totalEventsSent:
            clients.length > 0
              ? clients.reduce(
                  (sum, client) =>
                    sum + Number(client.metadata?.eventCount || 0),
                  0,
                )
              : 0,
          lastEventTime:
            clients.length > 0
              ? Math.max(...clients.map((c) => c.lastPing))
              : undefined,
        });
        setError(null);
      } catch (err) {
        setError("Failed to load connection stats");
        console.error(err);
      }
    };

    fetchStats(); // Initial fetch
    const interval = setInterval(fetchStats, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return <p className="text-red-500">Error: {error}</p>;
  }

  if (!stats) {
    return <p className="text-white">Loading connection stats...</p>;
  }

  return (
    <div className="mt-4 w-full max-w-md rounded-lg bg-white/10 p-4 shadow-md">
      <h3 className="mb-2 text-lg font-semibold text-white">
        Active Connections
      </h3>
      <p className="text-white">Total Clients: {stats.totalClients}</p>
      <h4 className="text-md mt-2 font-medium text-white">Clients by User</h4>
      <ul className="text-white">
        {Object.entries(stats.clientsByUser).map(([userId, count]) => (
          <li key={userId}>
            {userId}: {count} connection(s)
          </li>
        ))}
      </ul>
      <p className="mt-2 text-white">
        Average Connection Duration:{" "}
        {(stats.averageConnectionDuration / 1000).toFixed(2)} seconds
      </p>
      {stats.lastEventTime && (
        <p className="text-white">
          Last Event Time: {new Date(stats.lastEventTime).toLocaleString()}
        </p>
      )}
      <h4 className="text-md mt-2 font-medium text-white">Connected Clients</h4>
      <ul className="max-h-40 overflow-y-auto text-white">
        {clients.map((client) => (
          <li key={client.id} className="text-sm">
            ID: {client.id}, User: {client.userId || "anonymous"}, Connected:{" "}
            {new Date(client.connectedAt).toLocaleTimeString()}
          </li>
        ))}
      </ul>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { getSSEStats } from "../services/sse-service";

export function SSEMonitor() {
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/sse/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
        setError(null);
      } else {
        setError("Failed to fetch stats");
      }
    } catch (err) {
      setError("Error fetching stats");
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-gray-600">Loading stats...</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold">SSE Connection Statistics</h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {stats.totalConnections}
          </div>
          <div className="text-sm text-gray-600">Total Connections</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {stats.userConnections}
          </div>
          <div className="text-sm text-gray-600">Active Users</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {stats.sessionConnections}
          </div>
          <div className="text-sm text-gray-600">Active Sessions</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            {stats.maxConnections}
          </div>
          <div className="text-sm text-gray-600">Max Connections</div>
        </div>
      </div>

      <div className="mt-4 border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Connection Usage</span>
          <span className="text-sm font-medium">
            {Math.round((stats.totalConnections / stats.maxConnections) * 100)}%
          </span>
        </div>
        <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-blue-600 transition-all duration-300"
            style={{
              width: `${(stats.totalConnections / stats.maxConnections) * 100}%`,
            }}
          />
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
}

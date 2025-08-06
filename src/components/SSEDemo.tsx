"use client"

import { useEffect, useState } from 'react';
import {useSSE} from "@/lib/see/hooks";
import {cn} from "@/shared/utils"

interface SSEDemoStats {
    totalConnections: number;
    uniqueUsers: number;
    uniqueSessions: number;
}

export default function SSEDemo() {
    const [stats, setStats] = useState<SSEDemoStats | null>(null);
    const { connected, addEventListener } = useSSE();
    console.log('stats', stats)
    useEffect(() => {
        // Fetch initial stats
        fetchStats();

        // Listen for stats updates
        addEventListener('stats_update', (event) => {
            console.log("event.data", event.data)
            const data = JSON.parse(event.data);
            setStats(data);
        });

        // Refresh stats periodically
        const interval = setInterval(fetchStats, 3000);
        return () => clearInterval(interval);
    }, []);

    const fetchStats = async () => {
        try {
            const response = await fetch('/api/stats');
            const result = await response.json();
            if (result.success) {
                setStats(result.data);
            }
        } catch (error) {
            console.error('Failed to fetch SSE stats:', error);
        }
    };

    if (!stats) return <div>Loading stats...</div>;

    return (
        <div className="grid grid-cols-3 gap-4 p-4">
            <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900">Total Connections</h3>
                <p className="text-3xl font-bold text-blue-600">{stats.totalConnections}</p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900">Unique Users</h3>
                <p className="text-3xl font-bold text-green-600">{stats.uniqueUsers}</p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900">Sessions</h3>
                <p className="text-3xl font-bold text-purple-600">{stats.uniqueSessions}</p>
            </div>

            <div className="col-span-3 bg-white p-4 rounded-lg shadow">
                <div className={cn(
                    'inline-flex items-center px-2 py-1 rounded text-sm',
                    connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                )}>
          <span className={cn(
              'w-2 h-2 rounded-full mr-2',
              connected ? 'bg-green-500' : 'bg-red-500'
          )}></span>
                    {connected ? 'SSE Connected' : 'SSE Disconnected'}
                </div>
            </div>
        </div>
    );
}
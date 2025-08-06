"use client"
import {useSSE} from "@/lib/see/hooks";
import {cn} from "@/shared/utils"
import { useEffect, useState } from 'react';
interface SSEMessage {
    id: string;
    event: string;
    data: any;
    timestamp: Date;
}

interface SSEMessageHistoryProps {
    userId?: string;
    sessionId?: string;
    maxMessages?: number;
    className?: string;
}
export function SSEMessageHistory({
                                      userId,
                                      sessionId,
                                      maxMessages = 100,
                                      className
                                  }: SSEMessageHistoryProps) {
    const [messages, setMessages] = useState<SSEMessage[]>([]);
    const [filter, setFilter] = useState<string>('all');

    const {
        connected,
        connecting,
        error,
        lastEvent,
        addEventListener,
        removeEventListener
    } = useSSE({ userId, sessionId });

    useEffect(() => {
        if (lastEvent) {
            const message: SSEMessage = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                event: lastEvent.type || 'message',
                data: JSON.parse(lastEvent.data),
                timestamp: new Date()
            };

            setMessages(prev => [message, ...prev.slice(0, maxMessages - 1)]);
        }
    }, [lastEvent, maxMessages]);

    // Listen for specific events
    useEffect(() => {
        const eventTypes = ['connected', 'ping', 'progress', 'success', 'error', 'data_update'];

        eventTypes.forEach(eventType => {
            addEventListener(eventType, (event) => {
                const message: SSEMessage = {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    event: eventType,
                    data: JSON.parse(event.data),
                    timestamp: new Date()
                };

                setMessages(prev => [message, ...prev.slice(0, maxMessages - 1)]);
            });
        });

        return () => {
            eventTypes.forEach(eventType => {
                removeEventListener(eventType);
            });
        };
    }, [addEventListener, removeEventListener, maxMessages]);

    const filteredMessages = messages.filter(msg =>
        filter === 'all' || msg.event === filter
    );

    const uniqueEventTypes = [...new Set(messages.map(msg => msg.event))];

    const getEventColor = (eventType: string) => {
        switch (eventType) {
            case 'success': return 'text-green-600';
            case 'error': return 'text-red-600';
            case 'progress': return 'text-blue-600';
            case 'connected': return 'text-purple-600';
            case 'ping': return 'text-gray-500';
            default: return 'text-gray-700';
        }
    };

    const clearMessages = () => setMessages([]);

    return (
        <div className={cn('bg-white rounded-lg shadow-lg', className ||'')}>
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                        SSE Message History
                    </h3>
                    <div className="flex items-center space-x-2">
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="text-sm border border-gray-300 rounded px-2 py-1"
                        >
                            <option value="all">All Events</option>
                            {uniqueEventTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                        <button
                            onClick={clearMessages}
                            className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
                        >
                            Clear
                        </button>
                    </div>
                </div>

                {/* Connection Status */}
                <div className="flex items-center mt-2 space-x-4 text-sm">
          <span className={cn(
              'flex items-center',
              connected ? 'text-green-600' : 'text-red-600'
          )}>
            <span className={cn(
                'w-2 h-2 rounded-full mr-2',
                connected ? 'bg-green-500' : 'bg-red-500'
            )}></span>
              {connected ? 'Connected' : connecting ? 'Connecting...' : 'Disconnected'}
          </span>
                    <span className="text-gray-500">
            Messages: {filteredMessages.length}/{maxMessages}
          </span>
                </div>

                {error && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        {error}
                    </div>
                )}
            </div>

            {/* Message List */}
            <div className="max-h-96 overflow-y-auto">
                {filteredMessages.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No messages yet. {!connected && 'Connect to start receiving messages.'}
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {filteredMessages.map(message => (
                            <div key={message.id} className="p-4 hover:bg-gray-50">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-1">
                      <span className={cn(
                          'font-mono text-sm font-medium',
                          getEventColor(message.event)
                      )}>
                        {message.event}
                      </span>
                                            <span className="text-xs text-gray-500">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                                        </div>
                                        <div className="text-sm text-gray-700">
                      <pre className="whitespace-pre-wrap font-mono text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(message.data, null, 2)}
                      </pre>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
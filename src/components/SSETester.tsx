"use client"
import { useState } from 'react';
import {cn} from "@/shared/utils"

interface SSETesterProps {
    className?: string;
}

export function SSETester({ className }: SSETesterProps) {
    const [targetType, setTargetType] = useState<'user' | 'session' | 'broadcast'>('user');
    const [targetId, setTargetId] = useState('');
    const [eventType, setEventType] = useState('test');
    const [eventData, setEventData] = useState('{"message": "Hello from SSE tester!"}');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<string>('');

    const sendNotification = async () => {
        if (!targetId && targetType !== 'broadcast') {
            setResult('Error: Target ID is required for user and session targets');
            return;
        }

        try {
            setIsLoading(true);
            setResult('');

            let data;
            try {
                data = JSON.parse(eventData);
            } catch (error) {
                setResult('Error: Invalid JSON in event data');
                return;
            }

            const response = await fetch('/api/notifications/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    targetType,
                    targetId: targetType === 'broadcast' ? null : targetId,
                    event: eventType,
                    data
                })
            });

            const responseData = await response.json();

            if (responseData.success) {
                setResult(`Success: ${responseData.message}`);
            } else {
                setResult(`Error: ${responseData.error}`);
            }
        } catch (error) {
            setResult(` Network Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={cn('bg-white rounded-lg shadow-lg p-6', className ||'')}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                SSE Event Tester
            </h3>

            <div className="space-y-4">
                {/* Target Type */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Target Type
                    </label>
                    <select
                        value={targetType}
                        onChange={(e) => setTargetType(e.target.value as any)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-black"
                    >
                        <option value="user">User</option>
                        <option value="session">Session</option>
                        <option value="broadcast">Broadcast</option>
                    </select>
                </div>

                {/* Target ID */}
                {targetType !== 'broadcast' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Target ID ({targetType === 'user' ? 'User' : 'Session'} ID)
                        </label>
                        <input
                            type="text"
                            value={targetId}
                            onChange={(e) => setTargetId(e.target.value)}
                            placeholder={`Enter ${targetType} ID...`}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-black"
                        />
                    </div>
                )}

                {/* Event Type */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Event Type
                    </label>
                    <input
                        type="text"
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value)}
                        placeholder="Event name (e.g., 'notification', 'update')"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-black"
                    />
                </div>

                {/* Event Data */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Event Data (JSON)
                    </label>
                    <textarea
                        value={eventData}
                        onChange={(e) => setEventData(e.target.value)}
                        rows={4}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm text-black"
                        placeholder='{"key": "value"}'
                    />
                </div>

                {/* Send Button */}
                <button
                    onClick={sendNotification}
                    disabled={isLoading}
                    className={cn(
                        'w-full py-2 px-4 rounded-md font-medium',
                        isLoading
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                    )}
                >
                    {isLoading ? 'Sending...' : 'Send Event'}
                </button>

                {/* Result */}
                {result && (
                    <div className={cn(
                        'p-3 rounded-md text-sm',
                        result.startsWith('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                    )}>
                        {result}
                    </div>
                )}
            </div>
        </div>
    );
}

"use client"
import { useEffect, useState } from "react";
import {useSSE} from "@/lib/see/hooks";
import {cn} from "@/shared/utils"

interface Notification {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
    timestamp: string;
}

interface NotificationCenterProps {
    userId: string;
    className?: string;
}
export default function NotificationCenter({ userId, className }: NotificationCenterProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const { connected, connecting, error, addEventListener, removeEventListener } = useSSE({ userId });
    console.log('notifications', notifications)
    useEffect(() => {
        // Listen for different types of notifications
        addEventListener('success', (event) => {
            const data = JSON.parse(event.data);
            addNotification('success', data.message);
        });

        addEventListener('error', (event) => {
            const data = JSON.parse(event.data);
            addNotification('error', data.error);
        });

        addEventListener('data_update', (event) => {
            const data = JSON.parse(event.data);
            addNotification('info', `${data.resourceType} ${data.action}: ${data.resourceId}`);
        });

        addEventListener('progress', (event) => {
            const data = JSON.parse(event.data);
            addNotification('info', `${data.message} (${data.progress}%)`);
        });

        return () => {
            removeEventListener('success');
            removeEventListener('error');
            removeEventListener('data_update');
            removeEventListener('progress');
        };
    }, []);

    const addNotification = (type: Notification['type'], message: string) => {
        const notification: Notification = {
            id: Date.now().toString(),
            type,
            message,
            timestamp: new Date().toISOString()
        };

        setNotifications(prev => [notification, ...prev.slice(0, 9)]); // Keep last 10

        // Auto-remove after 5 seconds
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== notification.id));
        }, 5000);
    };

    const getNotificationStyles = (type: Notification['type']) => {
        switch (type) {
            case 'success':
                return 'bg-green-50 border-green-200 text-green-800';
            case 'error':
                return 'bg-red-50 border-red-200 text-red-800';
            case 'warning':
                return 'bg-yellow-50 border-yellow-200 text-yellow-800';
            default:
                return 'bg-blue-50 border-blue-200 text-blue-800';
        }
    };

    return (
        <div className={cn('fixed top-4 right-4 z-50 w-80', className)}>
            {/* Connection Status */}
            <div className={cn(
                'mb-2 px-3 py-1 rounded-full text-xs font-medium',
                connected ? 'bg-green-100 text-green-800' :
                    connecting ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
            )}>
                {connected ? '🟢 Connected' : connecting ? '🟡 Connecting...' : '🔴 Disconnected'}
            </div>

            {/* Error Display */}
            {error && (
                <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-red-800 text-xs">
                    {error}
                </div>
            )}

            {/* Notifications */}
            <div className="space-y-2">
                {notifications.map(notification => (
                    <div
                        key={notification.id}
                        className={cn(
                            'p-3 rounded-lg border shadow-sm animate-in slide-in-from-right',
                            getNotificationStyles(notification.type)
                        )}
                    >
                        <p className="text-sm font-medium">{notification.message}</p>
                        <p className="text-xs opacity-70 mt-1">
                            {new Date(notification.timestamp).toLocaleTimeString()}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
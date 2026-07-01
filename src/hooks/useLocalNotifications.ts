// import { useState, useEffect, useCallback } from 'react';

// export interface Notification {
//   id: string;
//   type: string;
//   message: string;
//   timestamp: string;
//   read: boolean;
//   data?: any;
// }

// export function useLocalNotifications(maxNotifications: number = 50) {
//   const [notifications, setNotifications] = useState<Notification[]>([]);

//   // Load notifications from localStorage on mount
//   useEffect(() => {
//     const stored = localStorage.getItem('notifications');
//     if (stored) {
//       try {
//         setNotifications(JSON.parse(stored));
//       } catch (error) {
//         console.error('Failed to parse stored notifications:', error);
//       }
//     }
//   }, []);

//   // Save to localStorage whenever notifications change
//   useEffect(() => {
//     localStorage.setItem('notifications', JSON.stringify(notifications));
//   }, [notifications]);

//   const addNotification = useCallback((notification: Omit<Notification, 'id' | 'read'>) => {
//     const newNotification: Notification = {
//       ...notification,
//       id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
//       read: false,
//     };

//     setNotifications(prev => {
//       const updated = [newNotification, ...prev];
//       return updated.slice(0, maxNotifications);
//     });
//   }, [maxNotifications]);

//   const markAsRead = useCallback((id: string) => {
//     setNotifications(prev =>
//       prev.map(notification =>
//         notification.id === id ? { ...notification, read: true } : notification
//       )
//     );
//   }, []);

//   const markAllAsRead = useCallback(() => {
//     setNotifications(prev =>
//       prev.map(notification => ({ ...notification, read: true }))
//     );
//   }, []);

//   const deleteNotification = useCallback((id: string) => {
//     setNotifications(prev => prev.filter(notification => notification.id !== id));
//   }, []);

//   const clearAll = useCallback(() => {
//     setNotifications([]);
//   }, []);

//   const refresh = useCallback(() => {
//     const stored = localStorage.getItem('notifications');
//     if (stored) {
//       try {
//         setNotifications(JSON.parse(stored));
//       } catch (error) {
//         console.error('Failed to parse stored notifications:', error);
//       }
//     }
//   }, []);

//   const unreadCount = notifications.filter(n => !n.read).length;

//   return {
//     notifications,
//     unreadCount,
//     addNotification,
//     markAsRead,
//     markAllAsRead,
//     deleteNotification,
//     clearAll,
//     refresh,
//   };
// }

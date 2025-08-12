"use client";

import React from 'react';
import { useSSE } from '../hooks/useSSE';

export interface SSEConnectionStatusProps {
  className?: string;
  showReconnectButton?: boolean;
  showConnectionInfo?: boolean;
}

export function SSEConnectionStatus({
  className = '',
  showReconnectButton = true,
  showConnectionInfo = true,
}: SSEConnectionStatusProps) {
  const { isConnected, isConnecting, error, connect, disconnect, reconnect } = useSSE();

  const getStatusColor = () => {
    if (error) return 'text-red-500';
    if (isConnecting) return 'text-yellow-500';
    if (isConnected) return 'text-green-500';
    return 'text-gray-500';
  };

  const getStatusText = () => {
    if (error) return 'Error';
    if (isConnecting) return 'Connecting...';
    if (isConnected) return 'Connected';
    return 'Disconnected';
  };

  const getStatusIcon = () => {
    if (error) return '🔴';
    if (isConnecting) return '🟡';
    if (isConnected) return '🟢';
    return '⚪';
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div className="flex items-center space-x-2">
        <span className="text-lg">{getStatusIcon()}</span>
        <span className={`font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>

      {showConnectionInfo && (
        <div className="text-sm text-gray-600">
          {isConnected && <span>Real-time updates active</span>}
          {isConnecting && <span>Establishing connection...</span>}
          {error && <span>Connection failed</span>}
          {!isConnected && !isConnecting && !error && <span>No active connection</span>}
        </div>
      )}

      {showReconnectButton && (
        <div className="flex space-x-2">
          {!isConnected && !isConnecting && (
            <button
              onClick={connect}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Connect
            </button>
          )}

          {isConnected && (
            <button
              onClick={disconnect}
              className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Disconnect
            </button>
          )}

          {error && (
            <button
              onClick={reconnect}
              className="px-3 py-1 text-sm bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
            >
              Reconnect
            </button>
          )}
        </div>
      )}
    </div>
  );
}

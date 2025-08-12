"use client";

import React from 'react';
import { useSSEEvent } from '../hooks/useSSEEvent';

interface VideoUploadEvent {
  type: string;
  status: 'processing' | 'ready' | 'cancelled' | 'error';
  data: any;
  timestamp: string;
}

export function VideoUploadStatus() {
  const { events: uploadEvents, isConnected } = useSSEEvent<VideoUploadEvent>('video_upload_update');
  const { events: assetEvents } = useSSEEvent<VideoUploadEvent>('video_asset_update');
  const { events: issueEvents } = useSSEEvent<VideoUploadEvent>('video_asset_issue');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'text-green-600 bg-green-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      case 'cancelled': return 'text-gray-600 bg-gray-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready': return '✅';
      case 'processing': return '⏳';
      case 'cancelled': return '❌';
      case 'error': return '⚠️';
      default: return '❓';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  if (!isConnected) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">Connect to SSE to receive real-time video upload updates</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Updates */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Video Upload Updates
        </h3>
        {uploadEvents.length === 0 ? (
          <p className="text-gray-500 italic">No upload updates yet</p>
        ) : (
          <div className="space-y-3">
            {uploadEvents.slice(-5).map((event, index) => (
              <div
                key={`${event.id || index}-${event.timestamp.getTime()}`}
                className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
              >
                <span className="text-lg">{getStatusIcon(event.data.status)}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(event.data.status)}`}>
                      {event.data.status}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(event.data.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">
                    {event.data.type}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Asset Updates */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Video Asset Updates
        </h3>
        {assetEvents.length === 0 ? (
          <p className="text-gray-500 italic">No asset updates yet</p>
        ) : (
          <div className="space-y-3">
            {assetEvents.slice(-5).map((event, index) => (
              <div
                key={`${event.id || index}-${event.timestamp.getTime()}`}
                className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
              >
                <span className="text-lg">{getStatusIcon(event.data.status)}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(event.data.status)}`}>
                      {event.data.status}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(event.data.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">
                    {event.data.type}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Asset Issues */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Asset Issues
        </h3>
        {issueEvents.length === 0 ? (
          <p className="text-gray-500 italic">No asset issues reported</p>
        ) : (
          <div className="space-y-3">
            {issueEvents.slice(-5).map((event, index) => (
              <div
                key={`${event.id || index}-${event.timestamp.getTime()}`}
                className="flex items-center space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg"
              >
                <span className="text-lg">⚠️</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-1 text-xs font-medium rounded-full text-red-600 bg-red-100">
                      {event.data.status}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(event.data.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-red-700 mt-1">
                    {event.data.type}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import React from "react";

interface ConnectionControlsProps {
  userId: string;
  setUserId: (userId: string) => void;
  sessionId: string;
  setSessionId: (sessionId: string) => void;
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export const ConnectionControls: React.FC<ConnectionControlsProps> = ({
  userId,
  setUserId,
  sessionId,
  setSessionId,
  isConnected,
  onConnect,
  onDisconnect,
}) => {
  return (
    <div className="mb-8 rounded-xl bg-white/5 p-6">
      <h2 className="mb-4 text-xl font-semibold">Connection Controls</h2>
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-medium">User ID</label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            disabled={isConnected}
            className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-gray-400 disabled:opacity-50"
            placeholder="e.g., user_123"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Session ID</label>
          <input
            type="text"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            disabled={isConnected}
            className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-gray-400 disabled:opacity-50"
            placeholder="e.g., session_456"
          />
        </div>
        <div className="flex items-end gap-2">
          <button
            onClick={onConnect}
            disabled={isConnected}
            className="flex-1 rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition-colors hover:bg-green-700 disabled:bg-gray-600 disabled:opacity-50"
          >
            Connect
          </button>
          <button
            onClick={onDisconnect}
            disabled={!isConnected}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700 disabled:bg-gray-600 disabled:opacity-50"
          >
            Disconnect
          </button>
        </div>
      </div>
    </div>
  );
};

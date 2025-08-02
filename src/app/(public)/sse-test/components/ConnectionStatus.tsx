import React from "react";

interface ConnectionStatusProps {
  isConnected: boolean;
  clientId: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  clientId,
}) => {
  return (
    <div className="rounded-xl bg-white/5 p-6">
      <h2 className="mb-4 text-xl font-semibold">Connection Status</h2>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div
            className={`h-3 w-3 rounded-full ${
              isConnected ? "bg-green-400" : "bg-red-400"
            }`}
          ></div>
          <span className="font-medium">
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
        {clientId && (
          <div className="text-sm text-gray-300">
            Client ID:{" "}
            <code className="rounded bg-white/10 px-2 py-1 text-xs">
              {clientId}
            </code>
          </div>
        )}
      </div>
    </div>
  );
};

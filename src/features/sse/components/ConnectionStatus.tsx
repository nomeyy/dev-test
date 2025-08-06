"use client";

interface ConnectionStatusProps {
  isConnected: boolean;
  clientId?: string;
  error?: Error | null;
}

export function ConnectionStatus({
  isConnected,
  clientId,
  error,
}: ConnectionStatusProps) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div
            className={`h-3 w-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
          />
          <span className="font-medium">
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
        {clientId && (
          <div className="text-sm text-gray-500">
            ID:{" "}
            <code className="rounded bg-gray-100 px-2 py-1">{clientId}</code>
          </div>
        )}
      </div>
      {error && (
        <div className="mt-3 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error.message}
        </div>
      )}
    </div>
  );
}

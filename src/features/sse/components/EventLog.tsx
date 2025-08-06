"use client";

interface EventMessage {
  type: string;
  data: any;
  timestamp: number;
}

interface EventLogProps {
  messages: EventMessage[];
  onClear?: () => void;
}

export function EventLog({ messages, onClear }: EventLogProps) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Event Log</h2>
        {onClear && messages.length > 0 && (
          <button
            onClick={onClear}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Clear Log
          </button>
        )}
      </div>

      {messages.length === 0 ? (
        <div className="py-8 text-center text-gray-500">
          No events received yet
        </div>
      ) : (
        <div className="max-h-[calc(100vh-300px)] space-y-2 overflow-y-auto">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`rounded p-3 ${
                msg.type === "system"
                  ? "border border-gray-200 bg-gray-50"
                  : msg.type === "message"
                    ? "border border-blue-200 bg-blue-50"
                    : msg.type === "notification"
                      ? "border border-yellow-200 bg-yellow-50"
                      : msg.type === "system-update"
                        ? "border border-green-200 bg-green-50"
                        : "border border-purple-200 bg-purple-50"
              }`}
            >
              <div className="mb-1 flex items-start justify-between">
                <span
                  className={`rounded px-2 py-0.5 text-sm font-medium ${
                    msg.type === "system"
                      ? "bg-gray-200 text-gray-800"
                      : msg.type === "message"
                        ? "bg-blue-200 text-blue-800"
                        : msg.type === "notification"
                          ? "bg-yellow-200 text-yellow-800"
                          : msg.type === "system-update"
                            ? "bg-green-200 text-green-800"
                            : "bg-purple-200 text-purple-800"
                  }`}
                >
                  {msg.type}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="mt-2 text-sm break-words">
                {typeof msg.data === "string" ? (
                  msg.data
                ) : (
                  <pre className="rounded bg-white/50 p-2 font-mono text-xs whitespace-pre-wrap">
                    {JSON.stringify(msg.data, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { SSEDemo, SSEMonitor } from "@/features/sse/components";

export default function SSEDemoPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="mb-4 text-4xl font-bold text-gray-900">
            Server-Sent Events Demo
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            This demo showcases the SSE (Server-Sent Events) functionality.
            Connect to receive real-time updates from the server, and use the
            test button to send messages to all connected clients.
          </p>
        </div>

        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-2">
          <SSEDemo />
          <SSEMonitor />
        </div>

        <div className="mx-auto mt-8 max-w-2xl">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h3 className="mb-2 text-lg font-semibold text-blue-900">
              How it works:
            </h3>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>• Click "Connect" to establish an SSE connection</li>
              <li>
                • The connection will automatically receive heartbeat messages
                every 30 seconds
              </li>
              <li>
                • Click "Send Test Message" to broadcast a message to all
                connected clients
              </li>
              <li>
                • The connection will automatically reconnect if disconnected
              </li>
              <li>
                • You can see connection status and message count in real-time
              </li>
              <li>• The monitor shows real-time connection statistics</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

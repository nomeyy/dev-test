import { SSEDemo } from "@/features/shared/components";

export default function SSEDemoPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto py-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8">
            <h1 className="mb-4 text-3xl font-bold text-gray-900">SSE Demo</h1>
            <p className="text-gray-600">
              This page demonstrates the Server-Sent Events (SSE) functionality.
              The SSE system provides real-time, server-to-client notifications
              with automatic reconnection and error handling.
            </p>
          </div>

          <div className="grid gap-6">
            <SSEDemo />

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
              <h3 className="mb-3 text-lg font-semibold text-blue-900">
                How it works:
              </h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li>
                  • The SSE connection is automatically established when the
                  page loads
                </li>
                <li>
                  • Click "Send Test Message" to trigger a test event from the
                  server
                </li>
                <li>
                  • Events are displayed in real-time with timestamps and
                  metadata
                </li>
                <li>
                  • The connection automatically reconnects if interrupted
                </li>
                <li>• Heartbeat messages keep the connection alive</li>
              </ul>
            </div>

            <div className="rounded-lg border border-green-200 bg-green-50 p-6">
              <h3 className="mb-3 text-lg font-semibold text-green-900">
                Features:
              </h3>
              <ul className="space-y-2 text-sm text-green-800">
                <li>• Real-time notifications with automatic reconnection</li>
                <li>• User-specific and broadcast messaging</li>
                <li>• Event history and latest event tracking</li>
                <li>• Connection status monitoring</li>
                <li>• Error handling and logging</li>
                <li>• Heartbeat mechanism to prevent timeouts</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

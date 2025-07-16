import { SSEDemo } from "@/features/sse";

export default function SSEDemoPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-8 text-center">
          <h1 className="mb-4 text-3xl font-bold text-gray-900">
            Server-Sent Events Demo
          </h1>
          <p className="mx-auto max-w-2xl text-gray-600">
            This demo showcases the SSE (Server-Sent Events) functionality.
            Connect to receive real-time notifications from the server.
          </p>
        </div>

        <SSEDemo userId="demo-user-123" />

        <div className="mt-8 rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">How to Use</h2>
          <div className="space-y-4 text-gray-700">
            <div>
              <h3 className="mb-2 font-medium">1. Connect to SSE Stream</h3>
              <p className="text-sm text-gray-600">
                Click "Connect" to establish a Server-Sent Events connection.
                You should see a "Connected" status indicator.
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-medium">2. Send Test Events</h3>
              <p className="text-sm text-gray-600">
                Use the test buttons to send different types of events:
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-600">
                <li>
                  <strong>Test Notification:</strong> Sends a regular
                  notification event
                </li>
                <li>
                  <strong>Test Alert:</strong> Sends a high-priority alert event
                </li>
                <li>
                  <strong>System Message:</strong> Broadcasts to all connected
                  clients
                </li>
              </ul>
            </div>
            <div>
              <h3 className="mb-2 font-medium">3. Monitor Events</h3>
              <p className="text-sm text-gray-600">
                All received events will appear in the messages list below the
                controls, showing:
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-600">
                <li>Event type (notification, alert, system, etc.)</li>
                <li>Message content</li>
                <li>Timestamp when received</li>
                <li>Server timestamp</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

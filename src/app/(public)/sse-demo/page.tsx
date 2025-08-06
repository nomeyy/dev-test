import { SSEDemo } from "@/features/sse";

export default function SSEDemoPage() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">
            Server-Sent Events Demo
          </h1>
          <p className="text-lg text-gray-600">
            Real-time communication between server and client
          </p>
        </div>

        <SSEDemo />

        <div className="mx-auto mt-8 max-w-2xl">
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-4 text-xl font-semibold">How it works</h3>
            <div className="space-y-3 text-sm text-gray-700">
              <p>
                <strong>1. Connection:</strong> Click "Connect" to establish an
                SSE connection with the server.
              </p>
              <p>
                <strong>2. Heartbeat:</strong> The server sends ping messages
                every 30 seconds to keep the connection alive.
              </p>
              <p>
                <strong>3. Send Messages:</strong> Use the form to send test
                messages or notifications to all connected clients.
              </p>
              <p>
                <strong>4. Real-time Updates:</strong> Messages appear instantly
                in the "Received Messages" section.
              </p>
              <p>
                <strong>5. Multiple Clients:</strong> Open multiple browser tabs
                to see messages broadcast to all clients.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

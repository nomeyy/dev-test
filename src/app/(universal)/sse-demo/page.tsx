import SSETester from "@/components/SSETester";

export default function SSEDemoPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="mb-4 text-3xl font-bold text-white">
            Server-Sent Events (SSE) Demo
          </h1>
          <p className="mb-6 text-gray-200">
            This demo showcases real-time server-to-client notifications using
            Server-Sent Events. Click the button below to send a test
            notification that will be received in real-time.
          </p>

          <div className="mb-6 rounded-lg border border-blue-300 bg-blue-100/90 p-4 backdrop-blur-sm">
            <h2 className="mb-2 font-semibold text-blue-900">How it works:</h2>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>
                • Client establishes SSE connection to{" "}
                <code className="rounded bg-blue-200 px-1 text-blue-900">
                  /api/sse
                </code>
              </li>
              <li>
                • Server maintains persistent connection and sends heartbeat
                pings
              </li>
              <li>
                • Backend can broadcast events to all clients or target specific
                clients
              </li>
              <li>• Connection automatically handles reconnection on errors</li>
            </ul>
          </div>
        </div>

        <SSETester />

        <div className="mt-8 rounded-lg border border-slate-300 bg-white/90 p-4 backdrop-blur-sm">
          <h3 className="mb-3 font-semibold text-gray-900">API Endpoints:</h3>
          <div className="space-y-2 text-sm">
            <div>
              <code className="rounded border border-slate-300 bg-slate-100 px-2 py-1 text-slate-900">
                GET /api/sse
              </code>
              <span className="ml-2 text-gray-700">
                - Establish SSE connection
              </span>
            </div>
            <div>
              <code className="rounded border border-slate-300 bg-slate-100 px-2 py-1 text-slate-900">
                POST /api/test-notify
              </code>
              <span className="ml-2 text-gray-700">
                - Send test notification to all clients
              </span>
            </div>
            <div>
              <code className="rounded border border-slate-300 bg-slate-100 px-2 py-1 text-slate-900">
                GET /api/test-notify
              </code>
              <span className="ml-2 text-gray-700">
                - Check connection status
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-yellow-300 bg-yellow-100/90 p-4 backdrop-blur-sm">
          <h3 className="mb-2 font-semibold text-yellow-900">
            Usage in Your App:
          </h3>
          <pre className="overflow-x-auto rounded border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900">
            <code>{`// Backend - Send notification to all clients
import { broadcast } from '@/lib/sse/sendEvent';
broadcast('notification', { message: 'Hello World!' });

// Backend - Send to specific client
import { sendToClient } from '@/lib/sse/sendEvent';
sendToClient('client-id', 'update', { data: {...} });`}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}

import { SSETestComponent } from "../../../../features/sse/components/SSETestComponent";

/**
 * SSE Test Page
 * Demonstrates the Server-Sent Events functionality with a simple UI
 */
export default function SSETestPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="mb-8 text-center">
          <h1 className="mb-4 text-3xl font-bold text-gray-900">
            Server-Sent Events Test
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            This page demonstrates real-time server-to-client communication
            using Server-Sent Events (SSE). Connect to receive live updates and
            test various event types.
          </p>
        </div>

        <SSETestComponent />

        <div className="mx-auto mt-12 max-w-4xl">
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              About SSE Implementation
            </h2>
            <div className="prose text-gray-700">
              <p className="mb-4">
                This SSE system provides a robust foundation for real-time
                notifications across your application. Key features include:
              </p>
              <ul className="mb-4 list-inside list-disc space-y-2">
                <li>Automatic connection management with reconnection logic</li>
                <li>User-specific and broadcast messaging capabilities</li>
                <li>Heartbeat mechanism to keep connections alive</li>
                <li>Proper cleanup of disconnected clients</li>
                <li>Redis-backed connection persistence</li>
                <li>Type-safe event system with predefined event types</li>
              </ul>
              <p className="mb-4">
                Backend services can easily send events using utility functions
                like:
              </p>
              <div className="mb-4 rounded bg-gray-100 p-3 font-mono text-sm">
                <div>sendNotificationToUsers(userIds, message, type)</div>
                <div>broadcastNotification(message, type)</div>
                <div>sendVideoUploadProgress(userId, uploadId, progress)</div>
                <div>sendCustomEvent(eventType, data, options)</div>
              </div>
              <p>
                The system integrates seamlessly with existing authentication
                and follows the established patterns in your codebase.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

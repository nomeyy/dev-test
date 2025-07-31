import { SSEMinimalTest } from "@/features/sse";

export default function SSETestPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-4 text-center text-3xl font-light text-gray-900">
            SSE Test Interface
          </h1>

          <SSEMinimalTest />
          {/* Instructions */}
          <div className="mt-8 mb-8 rounded-lg bg-blue-50 p-6">
            <h2 className="mb-3 text-lg font-medium text-blue-900">
              Testing Instructions
            </h2>
            <div className="space-y-2 text-sm text-blue-800">
              <p>
                <strong>1. Single Client Testing:</strong>
              </p>
              <ul className="ml-4 list-disc space-y-1">
                <li>Connect to SSE using the &ldquo;Connect&rdquo; button</li>
                <li>
                  Use &ldquo;Broadcast to All&rdquo; to send events to all
                  connected clients
                </li>
                <li>Copy your Client ID from the Connection Info section</li>
                <li>
                  Use &ldquo;Send to Client&rdquo; with your Client ID to test
                  specific client targeting
                </li>
              </ul>

              <p className="mt-4">
                <strong>2. Multi-Client Testing:</strong>
              </p>
              <ul className="ml-4 list-disc space-y-1">
                <li>Open multiple browser tabs/windows to this page</li>
                <li>Connect each tab to create multiple SSE clients</li>
                <li>
                  Use different User IDs by adding <code>?userId=user1</code>,{" "}
                  <code>?userId=user2</code> to the URL
                </li>
                <li>
                  Test &ldquo;Send to User&rdquo; functionality by targeting
                  specific user IDs
                </li>
                <li>
                  Test &ldquo;Send to Client&rdquo; by copying Client IDs from
                  different tabs
                </li>
              </ul>

              <p className="mt-4">
                <strong>3. Testing Scenarios:</strong>
              </p>
              <ul className="ml-4 list-disc space-y-1">
                <li>
                  <strong>Broadcast:</strong> All connected clients receive the
                  event
                </li>
                <li>
                  <strong>Send to Client:</strong> Only the specified client
                  receives the event
                </li>
                <li>
                  <strong>Send to User:</strong> All clients of the specified
                  user receive the event
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

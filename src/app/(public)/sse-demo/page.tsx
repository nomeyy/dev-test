import { SSEDemo, SSETest } from "@/features/sse";

export default function SSEDemoPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="mb-4 text-3xl font-bold">Server-Sent Events Demo</h1>
          <p className="text-gray-600">
            This page demonstrates the SSE (Server-Sent Events) functionality.
            Open multiple browser tabs to see real-time communication between
            clients.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">Simple SSE Test</h2>
          <SSETest />
        </div>

        <div className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">Full SSE Demo</h2>
          <SSEDemo />
        </div>

        <div className="mt-8 rounded-lg bg-blue-50 p-6">
          <h3 className="mb-2 text-lg font-semibold">How to Test:</h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-gray-700">
            <li>Open this page in multiple browser tabs/windows</li>
            <li>Send test messages or notifications from any tab</li>
            <li>Watch the events appear in real-time across all tabs</li>
            <li>Check the browser console for detailed event logs</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

import { SSEDemo } from "@/features/sse";

export default function SSEDemoPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="mb-4 text-3xl font-bold">SSE Demo</h1>
        <p className="mb-4 text-gray-600">
          This page demonstrates the Server-Sent Events (SSE) functionality.
          Connect to the SSE stream and watch for real-time updates.
        </p>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h2 className="mb-2 font-semibold text-blue-800">How to test:</h2>
          <ul className="space-y-1 text-sm text-blue-700">
            <li>• Connect to the SSE stream using the button below</li>
            <li>• Send test events using the API endpoints</li>
            <li>• Watch for real-time notifications and updates</li>
            <li>• Monitor upload progress and asset ready events</li>
          </ul>
        </div>
      </div>

      <SSEDemo userId="demo-user-123" />
    </div>
  );
}

/**
 * SSE Demo Page
 * ------------
 * Demo page to showcase SSE functionality
 */

import { SSETestPanel } from "@/features/sse";

export default function SSEDemoPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-4 text-3xl font-bold text-gray-900">
          Server-Sent Events Demo
        </h1>
        <p className="mb-4 text-gray-600">
          This page demonstrates the real-time SSE functionality. Use the
          controls below to test different types of events and see how they are
          received in real-time.
        </p>
        <div className="border-l-4 border-blue-400 bg-blue-50 p-4">
          <div className="text-sm text-blue-700">
            <strong>How to test:</strong>
            <ol className="mt-2 list-inside list-decimal space-y-1">
              <li>
                The connection should automatically establish when the page
                loads
              </li>
              <li>Use the test buttons to send different types of events</li>
              <li>Watch the different panels update with incoming events</li>
              <li>
                Try disconnecting and reconnecting to test connection management
              </li>
            </ol>
          </div>
        </div>
      </div>

      <SSETestPanel />

      <div className="mt-8 rounded-lg bg-gray-50 p-6">
        <h2 className="mb-4 text-xl font-semibold">Event Types</h2>
        <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
          <div className="rounded border bg-white p-3">
            <h3 className="font-semibold text-blue-600">Notifications</h3>
            <p className="text-gray-600">
              System notifications with title, message, and type
            </p>
          </div>
          <div className="rounded border bg-white p-3">
            <h3 className="font-semibold text-purple-600">Messages</h3>
            <p className="text-gray-600">
              Chat-like messages with sender and content
            </p>
          </div>
          <div className="rounded border bg-white p-3">
            <h3 className="font-semibold text-orange-600">Custom Events</h3>
            <p className="text-gray-600">
              Any custom event type with arbitrary data
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

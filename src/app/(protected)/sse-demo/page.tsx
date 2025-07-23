import { SSEDemo } from "@/features/sse";

export default function SSEDemoPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="mb-4 text-3xl font-bold text-white">
          Server-Sent Events Demo
        </h1>
        <p className="max-w-2xl text-shadow-white">
          This page demonstrates the SSE (Server-Sent Events) functionality. The
          connection will automatically establish when the page loads, and you
          can test sending various types of events to see real-time updates.
        </p>
      </div>

      <SSEDemo />
    </div>
  );
}

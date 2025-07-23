import { SSEDemo } from "@/features/sse";

export default function SSETestPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="mb-4 text-3xl font-bold text-white">
          SSE Test Page (Public)
        </h1>
        <p className="max-w-2xl text-shadow-white">
          This is a public test page for the SSE (Server-Sent Events)
          functionality. You can test SSE without authentication. Note that
          user-specific events won&apos;t work without being logged in.
        </p>
        <div className="mt-4 rounded-md border border-yellow-500/20 bg-yellow-500/10 p-4">
          <p className="text-sm text-yellow-300">
            <strong>Note:</strong> For the full demo with authentication
            features, visit{" "}
            <a
              href="/sse-demo"
              className="text-yellow-100 underline hover:text-yellow-50"
            >
              /sse-demo
            </a>{" "}
            after logging in.
          </p>
        </div>
      </div>

      <SSEDemo />
    </div>
  );
}

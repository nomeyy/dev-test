import SSETestPanel from "./SSETestPanel";

const SseExamplePage = () => {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            Server-Sent Events Test
          </h1>
          <p className="text-gray-600">
            This page demonstrates the SSE connection to /api/sse
          </p>
        </div>

        <SSETestPanel />

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            The component will automatically connect to your SSE endpoint and
            display incoming messages and ping events in real-time.
          </p>
        </div>
      </div>
    </div>
  );
};
export default SseExamplePage;

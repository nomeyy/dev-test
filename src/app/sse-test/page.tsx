import { SSEMinimalTest } from "@/features/sse";

export default function SSETestPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-8 text-center text-3xl font-light text-gray-900">
            SSE Test Interface
          </h1>
          <SSEMinimalTest />
        </div>
      </div>
    </div>
  );
}

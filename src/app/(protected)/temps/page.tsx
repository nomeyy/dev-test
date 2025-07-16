import SSEDemoClient from './SSEDemoClient';

export default function TempsPage() {
  return (
    <div className="max-w-xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">SSE Demo</h1>
      <SSEDemoClient />
    </div>
  );
} 
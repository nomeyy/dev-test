"use client";

import { useState } from "react";

export default function APITestPage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [`${new Date().toLocaleTimeString()}: ${message}`, ...prev.slice(0, 9)]);
  };

  const testAPIRoute = async () => {
    setIsLoading(true);
    addResult("Testing API route...");
    
    try {
      const response = await fetch("/api/sse/test", {
        method: "GET",
      });
      
      addResult(`GET Response: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        addResult(`GET Data: ${JSON.stringify(data)}`);
      } else {
        const errorText = await response.text();
        addResult(`GET Error: ${errorText}`);
      }
    } catch (error) {
      addResult(`GET Exception: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    setIsLoading(false);
  };

  const testPOSTRoute = async () => {
    setIsLoading(true);
    addResult("Testing POST route...");
    
    try {
      const response = await fetch("/api/sse/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "notification",
          title: "API Test",
          message: "Testing from API test page",
          level: "info",
        }),
      });
      
      addResult(`POST Response: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        addResult(`POST Data: ${JSON.stringify(data)}`);
      } else {
        const errorText = await response.text();
        addResult(`POST Error: ${errorText}`);
      }
    } catch (error) {
      addResult(`POST Exception: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    setIsLoading(false);
  };

  const testSSERoute = async () => {
    setIsLoading(true);
    addResult("Testing SSE route...");
    
    try {
      const response = await fetch("/api/sse", {
        method: "GET",
      });
      
      addResult(`SSE Response: ${response.status} ${response.statusText}`);
      addResult(`SSE Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);
      
      if (response.ok) {
        addResult("SSE route is accessible");
      } else {
        const errorText = await response.text();
        addResult(`SSE Error: ${errorText}`);
      }
    } catch (error) {
      addResult(`SSE Exception: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">API Route Test</h1>
        
        <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold mb-3 text-gray-700">Test API Routes</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={testAPIRoute}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Test GET /api/sse/test
            </button>
            <button
              onClick={testPOSTRoute}
              disabled={isLoading}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Test POST /api/sse/test
            </button>
            <button
              onClick={testSSERoute}
              disabled={isLoading}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Test GET /api/sse
            </button>
          </div>
        </div>

        <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold mb-3 text-gray-700">Test Results</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {testResults.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                No test results yet. Click a test button above.
              </div>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className="p-2 bg-gray-100 rounded text-sm font-mono">
                  {result}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="text-sm text-gray-600 bg-white p-4 rounded-lg shadow-sm border">
          <h3 className="font-semibold mb-2 text-gray-700">Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>Click "Test GET /api/sse/test" to check if the API route is accessible</li>
            <li>Click "Test POST /api/sse/test" to test sending a notification</li>
            <li>Click "Test GET /api/sse" to check if the SSE endpoint is working</li>
            <li>Check the results below to see what's happening</li>
            <li>If any test fails, the error details will be shown</li>
          </ol>
        </div>
      </div>
    </div>
  );
} 
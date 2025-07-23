"use client";

import { useState, useEffect } from "react";

interface SSEEvent {
  type: string;
  data: Record<string, unknown>;
  id?: string;
  timestamp?: number;
  rawEvent?: string;
}

/**
 * Enhanced SSE test page with real-time event display
 */
export default function SSETestPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [clientId, setClientId] = useState<string>("");

  useEffect(() => {
    // Enhanced SSE connection with better event handling
    const eventSource = new EventSource("/api/sse");
    
    eventSource.onopen = () => {
      setConnectionStatus("Connected");
      setIsConnected(true);
      console.log("SSE connection opened");
    };

    // Handle all events generically
    const handleEvent = (event: MessageEvent, eventType: string) => {
      try {
        const data = JSON.parse(event.data) as Record<string, unknown>;
        const newEvent: SSEEvent = {
          type: eventType,
          data,
          id: event.lastEventId || Date.now().toString(),
          timestamp: Date.now(),
          rawEvent: `event: ${eventType}\ndata: ${event.data}\nid: ${event.lastEventId || Date.now()}\ntimestamp: ${Date.now()}`
        };
        
        setEvents(prev => [newEvent, ...prev.slice(0, 19)]); // Keep last 20 events
        
        // Extract client ID from system_message
        if (eventType === "system_message" && typeof data.clientId === "string") {
          setClientId(data.clientId);
        }
        
        console.log(`SSE Event [${eventType}]:`, data);
      } catch (error) {
        console.error("Error parsing SSE event:", error);
      }
    };

    // Listen for specific event types
    eventSource.addEventListener("system_message", (event) => {
      handleEvent(event, "system_message");
      setConnectionStatus("Connected");
    });

    eventSource.addEventListener("heartbeat", (event) => {
      handleEvent(event, "heartbeat");
      setConnectionStatus("Connected (Heartbeat received)");
    });

    eventSource.addEventListener("notification", (event) => {
      handleEvent(event, "notification");
    });

    eventSource.addEventListener("user_update", (event) => {
      handleEvent(event, "user_update");
    });

    eventSource.addEventListener("reel_upload", (event) => {
      handleEvent(event, "reel_upload");
    });

    eventSource.addEventListener("search_result", (event) => {
      handleEvent(event, "search_result");
    });

    eventSource.addEventListener("ping", (event) => {
      handleEvent(event, "ping");
    });

    // Handle generic messages
    eventSource.onmessage = (event) => {
      handleEvent(event, "message");
    };

    eventSource.onerror = (error) => {
      console.error("SSE Error:", error);
      setConnectionStatus("Error - Check authentication");
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const sendTestNotification = async () => {
    try {
      console.log("Sending test notification...");
      
      const response = await fetch("/api/sse/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "notification",
          title: "Test Notification",
          message: `Test message sent at ${new Date().toLocaleTimeString()}`,
          level: "info",
        }),
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Response error text:", errorText);
        throw new Error(`Failed to send test notification: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Test notification sent successfully:", result);
      
      // Add a success event to the UI
      const successEvent: SSEEvent = {
        type: "test_success",
        data: {
          message: "Test notification sent successfully",
          timestamp: new Date().toISOString(),
          result
        },
        timestamp: Date.now(),
        rawEvent: `event: test_success\ndata: ${JSON.stringify({ message: "Test notification sent successfully" })}\nid: ${Date.now()}\ntimestamp: ${Date.now()}`
      };
      
      setEvents(prev => [successEvent, ...prev.slice(0, 19)]);
      
    } catch (error) {
      console.error("Error sending test notification:", error);
      
      // Add an error event to the UI
      const errorEvent: SSEEvent = {
        type: "test_error",
        data: {
          message: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.stack : String(error)
        },
        timestamp: Date.now(),
        rawEvent: `event: test_error\ndata: ${JSON.stringify({ message: error instanceof Error ? error.message : "Unknown error" })}\nid: ${Date.now()}\ntimestamp: ${Date.now()}`
      };
      
      setEvents(prev => [errorEvent, ...prev.slice(0, 19)]);
    }
  };

  const sendTestEvent = async (eventType: string, data: Record<string, unknown>) => {
    try {
      console.log(`Sending ${eventType} event...`);
      
      const response = await fetch("/api/sse/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: eventType,
          ...data,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Response error text:", errorText);
        throw new Error(`Failed to send ${eventType} event: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`${eventType} event sent successfully:`, result);
      
      // Add a success event to the UI
      const successEvent: SSEEvent = {
        type: "test_success",
        data: {
          message: `${eventType} event sent successfully`,
          timestamp: new Date().toISOString(),
          result
        },
        timestamp: Date.now(),
        rawEvent: `event: test_success\ndata: ${JSON.stringify({ message: `${eventType} event sent successfully` })}\nid: ${Date.now()}\ntimestamp: ${Date.now()}`
      };
      
      setEvents(prev => [successEvent, ...prev.slice(0, 19)]);
      
    } catch (error) {
      console.error(`Error sending ${eventType} event:`, error);
      
      // Add an error event to the UI
      const errorEvent: SSEEvent = {
        type: "test_error",
        data: {
          message: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.stack : String(error)
        },
        timestamp: Date.now(),
        rawEvent: `event: test_error\ndata: ${JSON.stringify({ message: error instanceof Error ? error.message : "Unknown error" })}\nid: ${Date.now()}\ntimestamp: ${Date.now()}`
      };
      
      setEvents(prev => [errorEvent, ...prev.slice(0, 19)]);
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case "system_message": return "bg-blue-100 border-blue-300";
      case "heartbeat": return "bg-green-100 border-green-300";
      case "notification": return "bg-yellow-100 border-yellow-300";
      case "user_update": return "bg-purple-100 border-purple-300";
      case "reel_upload": return "bg-orange-100 border-orange-300";
      case "search_result": return "bg-indigo-100 border-indigo-300";
      case "ping": return "bg-gray-100 border-gray-300";
      case "test_success": return "bg-emerald-100 border-emerald-300";
      case "test_error": return "bg-red-100 border-red-300";
      default: return "bg-white border-gray-300";
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">SSE Real-Time Event Monitor</h1>
        
        {/* Connection Status */}
        <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold mb-3 text-gray-700">Connection Status</h2>
          <div className="flex items-center gap-3">
            <div 
              className={`w-4 h-4 rounded-full ${
                isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
              }`}
            />
            <span className="font-mono text-sm">{connectionStatus}</span>
            {clientId && (
              <span className="text-xs text-gray-500 ml-4">
                Client ID: {clientId}
              </span>
            )}
          </div>
        </div>

        {/* Event Controls */}
        <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold mb-3 text-gray-700">Send Test Events</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button
              onClick={sendTestNotification}
              disabled={!isConnected}
              className="px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Notification
            </button>
            <button
              onClick={() => sendTestEvent("user_update", { field: "status", value: "online" })}
              disabled={!isConnected}
              className="px-3 py-2 bg-purple-500 text-white text-sm rounded hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              User Update
            </button>
            <button
              onClick={() => sendTestEvent("reel_upload", { reelId: "test-123", status: "processing", progress: 75 })}
              disabled={!isConnected}
              className="px-3 py-2 bg-orange-500 text-white text-sm rounded hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Reel Upload
            </button>
            <button
              onClick={() => sendTestEvent("ping", {})}
              disabled={!isConnected}
              className="px-3 py-2 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Ping
            </button>
          </div>
        </div>

        {/* Real-Time Events Display */}
        <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold mb-3 text-gray-700">
            Real-Time Events ({events.length})
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {events.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                No events received yet. Waiting for SSE connection...
              </div>
            ) : (
              events.map((event, index) => (
                <div 
                  key={`${event.id}-${index}`}
                  className={`p-3 rounded-lg border ${getEventColor(event.type)} transition-all duration-200 hover:shadow-md`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-white rounded text-xs font-mono text-gray-700">
                        {event.type}
                      </span>
                      {event.timestamp && (
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(event.timestamp)}
                        </span>
                      )}
                    </div>
                    {event.id && (
                      <span className="text-xs text-gray-400 font-mono">
                        ID: {event.id}
                      </span>
                    )}
                  </div>
                  
                  {/* Event Data */}
                  <div className="bg-white rounded p-2 border">
                    <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap">
                      {JSON.stringify(event.data, null, 2)}
                    </pre>
                  </div>
                  
                  {/* Raw Event (collapsible) */}
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                      Show raw event
                    </summary>
                    <div className="mt-1 bg-gray-100 rounded p-2">
                      <pre className="text-xs font-mono text-gray-600 whitespace-pre-wrap">
                        {event.rawEvent}
                      </pre>
                    </div>
                  </details>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="text-sm text-gray-600 bg-white p-4 rounded-lg shadow-sm border">
          <h3 className="font-semibold mb-2 text-gray-700">How to test:</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>Wait for the connection to establish (status should show "Connected")</li>
            <li>Click any test button to send different types of events</li>
            <li>Watch events appear in real-time in the events list above</li>
            <li>Heartbeat events will be sent automatically every 30 seconds</li>
            <li>Expand "Show raw event" to see the exact SSE format</li>
          </ol>
        </div>
      </div>
    </div>
  );
} 
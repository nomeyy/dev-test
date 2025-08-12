"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/trpc/react";

interface SseMessage {
  event: string;
  data: any;
  timestamp: number;
}

interface ConnectionInfo {
  connId: string;
  userId?: string;
  sessionId?: string;
  topics: string[];
  connectedAt: number;
  lastActivity: number;
  userAgent?: string;
  ip?: string;
}

export default function SseDemo() {
  const [messages, setMessages] = useState<SseMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [testMessage, setTestMessage] = useState('');
  const [testTopic, setTestTopic] = useState('test-topic');
  const [selectedEvent, setSelectedEvent] = useState('test_message');
  const esRef = useRef<EventSource | null>(null);

  // SSE connection management
  useEffect(() => {
    const connectSSE = () => {
      setConnectionStatus('connecting');
      const es = new EventSource("/api/sse?topic=test-topic,notifications,updates", { 
        withCredentials: true 
      });

      es.addEventListener("open", () => {
        setConnectionStatus('connected');
        console.log("SSE connection opened");
      });

      es.addEventListener("message", (e) => {
        const message: SseMessage = {
          event: 'message',
          data: e.data,
          timestamp: Date.now()
        };
        setMessages(prev => [message, ...prev.slice(0, 49)]); // Keep last 50 messages
      });

      es.addEventListener("welcome", (e) => {
        const data = JSON.parse(e.data);
        setConnectionInfo(data);
        const message: SseMessage = {
          event: 'welcome',
          data,
          timestamp: Date.now()
        };
        setMessages(prev => [message, ...prev.slice(0, 49)]);
      });

      es.addEventListener("test_message", (e) => {
        const data = JSON.parse(e.data);
        const message: SseMessage = {
          event: 'test_message',
          data,
          timestamp: Date.now()
        };
        setMessages(prev => [message, ...prev.slice(0, 49)]);
      });

      es.addEventListener("topic_message", (e) => {
        const data = JSON.parse(e.data);
        const message: SseMessage = {
          event: 'topic_message',
          data,
          timestamp: Date.now()
        };
        setMessages(prev => [message, ...prev.slice(0, 49)]);
      });

      es.addEventListener("broadcast_message", (e) => {
        const data = JSON.parse(e.data);
        const message: SseMessage = {
          event: 'broadcast_message',
          data,
          timestamp: Date.now()
        };
        setMessages(prev => [message, ...prev.slice(0, 49)]);
      });

      es.addEventListener("new_message", (e) => {
        const data = JSON.parse(e.data);
        const message: SseMessage = {
          event: 'new_message',
          data,
          timestamp: Date.now()
        };
        setMessages(prev => [message, ...prev.slice(0, 49)]);
      });

      es.addEventListener("system_update", (e) => {
        const data = JSON.parse(e.data);
        const message: SseMessage = {
          event: 'system_update',
          data,
          timestamp: Date.now()
        };
        setMessages(prev => [message, ...prev.slice(0, 49)]);
      });

      es.addEventListener("live_update", (e) => {
        const data = JSON.parse(e.data);
        const message: SseMessage = {
          event: 'live_update',
          data,
          timestamp: Date.now()
        };
        setMessages(prev => [message, ...prev.slice(0, 49)]);
      });

      es.addEventListener("error", (e) => {
        setConnectionStatus('error');
        console.error("SSE connection error:", e);
        const message: SseMessage = {
          event: 'error',
          data: { message: 'Connection error occurred' },
          timestamp: Date.now()
        };
        setMessages(prev => [message, ...prev.slice(0, 49)]);
      });

      es.addEventListener("close", () => {
        setConnectionStatus('disconnected');
        console.log("SSE connection closed");
      });

      esRef.current = es;
    };

    connectSSE();

    return () => {
      if (esRef.current) {
        esRef.current.close();
      }
    };
  }, []);

  // tRPC mutations
  const sendTestToUser = api.sse.sendTestToUser.useMutation();
  const sendTestToTopic = api.sse.sendTestToTopic.useMutation();
  const sendTestBroadcast = api.sse.sendTestBroadcast.useMutation();
  const sendTestToSession = api.sse.sendTestToSession.useMutation();
  const sendNewMessage = api.sse.sendNewMessage.useMutation();
  const sendSystemUpdate = api.sse.sendSystemUpdate.useMutation();
  const sendLiveUpdate = api.sse.sendLiveUpdate.useMutation();
  const getStats = api.sse.getStats.useQuery(undefined, {
    refetchInterval: 5000, // Refresh every 5 seconds
  });
  const getMyConnections = api.sse.getMyConnections.useQuery(undefined, {
    refetchInterval: 3000, // Refresh every 3 seconds
  });

  const handleSendTestToUser = () => {
    sendTestToUser.mutate({
      message: testMessage || "Hello from user test!",
      event: selectedEvent
    });
  };

  const handleSendTestToSession = () => {
    const sessionId =
      connectionInfo?.sessionId ||
      (getMyConnections.data && (getMyConnections.data as any[])[0]?.sessionId) ||
      undefined;

    if (!sessionId) {
      alert("No sessionId available. Open the SSE connection first.");
      return;
    }

    sendTestToSession.mutate({
      sessionId,
      message: testMessage || "Hello from session test!",
      event: selectedEvent,
    });
  };

  const handleSendTestToTopic = () => {
    sendTestToTopic.mutate({
      topic: testTopic,
      message: testMessage || "Hello from topic test!",
      event: selectedEvent
    });
  };

  const handleSendBroadcast = () => {
    sendTestBroadcast.mutate({
      message: testMessage || "Hello everyone!",
      event: selectedEvent
    });
  };

  const handleSendNewMessage = () => {
    sendNewMessage.mutate({
      userId: connectionInfo?.userId || "test-user",
      message: {
        id: `msg-${Date.now()}`,
        content: testMessage || "This is a new message!",
        sender: "Demo User",
        roomId: "demo-room"
      }
    });
  };

  const handleSendSystemUpdate = () => {
    sendSystemUpdate.mutate({
      event: "demo_update",
      data: {
        message: testMessage || "System update from demo",
        version: "1.0.0",
        timestamp: Date.now()
      }
    });
  };

  const handleSendLiveUpdate = () => {
    sendLiveUpdate.mutate({
      topic: testTopic,
      data: {
        message: testMessage || "Live update from demo",
        value: Math.random() * 100,
        timestamp: Date.now()
      }
    });
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 text-black">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold mb-4">SSE Demo Dashboard</h1>
        
        {/* Connection Status */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Connection Status</h2>
          <div className="flex items-center space-x-4">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              connectionStatus === 'connected' ? 'bg-green-100 text-green-800' :
              connectionStatus === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
              connectionStatus === 'error' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {connectionStatus.toUpperCase()}
            </div>
            {connectionInfo && (
              <div className="text-sm text-gray-600">
                Connection ID: {connectionInfo.connId}
                {connectionInfo.sessionId && (
                  <>
                    {" "}| Session: {connectionInfo.sessionId}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">SSE Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.activeConnections}</div>
                <div className="text-sm text-gray-600">Active Connections</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.totalEventsSent}</div>
                <div className="text-sm text-gray-600">Events Sent</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.totalErrors}</div>
                <div className="text-sm text-gray-600">Errors</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{Math.floor(stats.uptime / 1000)}s</div>
                <div className="text-sm text-gray-600">Uptime</div>
              </div>
            </div>
          </div>
        )}

        {/* Test Controls */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Type
              </label>
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="test_message">Test Message</option>
                <option value="topic_message">Topic Message</option>
                <option value="broadcast_message">Broadcast Message</option>
                <option value="new_message">New Message</option>
                <option value="system_update">System Update</option>
                <option value="live_update">Live Update</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Topic
              </label>
              <input
                type="text"
                value={testTopic}
                onChange={(e) => setTestTopic(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter topic name"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message
            </label>
            <input
              type="text"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your message"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            <button
              onClick={handleSendTestToUser}
              disabled={sendTestToUser.isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {sendTestToUser.isLoading ? 'Sending...' : 'To User'}
            </button>
            
            <button
              onClick={handleSendTestToTopic}
              disabled={sendTestToTopic.isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {sendTestToTopic.isLoading ? 'Sending...' : 'To Topic'}
            </button>
            
            <button
              onClick={handleSendBroadcast}
              disabled={sendTestBroadcast.isLoading}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {sendTestBroadcast.isLoading ? 'Sending...' : 'Broadcast'}
            </button>
            
            <button
              onClick={handleSendTestToSession}
              disabled={sendTestToSession.isLoading}
              className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50"
            >
              {sendTestToSession.isLoading ? 'Sending...' : 'To Session'}
            </button>
            
            <button
              onClick={handleSendNewMessage}
              disabled={sendNewMessage.isLoading}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
            >
              {sendNewMessage.isLoading ? 'Sending...' : 'New Message'}
            </button>
            
            <button
              onClick={handleSendSystemUpdate}
              disabled={sendSystemUpdate.isLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {sendSystemUpdate.isLoading ? 'Sending...' : 'System Update'}
            </button>
            
            <button
              onClick={handleSendLiveUpdate}
              disabled={sendLiveUpdate.isLoading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {sendLiveUpdate.isLoading ? 'Sending...' : 'Live Update'}
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Received Messages ({messages.length})</h2>
          <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="text-gray-500 text-center py-8">No messages received yet</div>
            ) : (
              <div className="space-y-2">
                {messages.map((message, index) => (
                  <div key={index} className="bg-white p-3 rounded border">
                    <div className="flex justify-between items-start mb-1">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        message.event === 'welcome' ? 'bg-green-100 text-green-800' :
                        message.event === 'error' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {message.event}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </div>
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                      {JSON.stringify(message.data, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* My Connections */}
        {getMyConnections.data && getMyConnections.data.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">My Connections ({getMyConnections.data.length})</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-2">
                {getMyConnections.data.map((conn: ConnectionInfo, index: number) => (
                  <div key={index} className="bg-white p-3 rounded border">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">Connection {index + 1}</div>
                        <div className="text-sm text-gray-600">ID: {conn.connId}</div>
                        <div className="text-sm text-gray-600">
                          Topics: {conn.topics.join(', ') || 'None'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">
                          Connected: {formatTimestamp(conn.connectedAt)}
                        </div>
                        <div className="text-sm text-gray-600">
                          Last Activity: {formatTimestamp(conn.lastActivity)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

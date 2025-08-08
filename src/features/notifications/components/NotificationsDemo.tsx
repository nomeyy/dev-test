"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils";

export const NotificationsDemo = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [latestMessage, setLatestMessage] = useState<string>("No messages yet");

  // Subscribe to notifications
  const notifications = api.notifications.subscribe.useSubscription(undefined, {
    enabled: isConnected,
    onData(event) {
      // Show the latest message in the text component
      if (event.data && typeof event.data === 'object' && 'message' in event.data) {
        setLatestMessage(event.data.message as string);
      } else if (event.data && typeof event.data === 'object' && 'text' in event.data) {
        setLatestMessage(event.data.text as string);
      } else {
        setLatestMessage(JSON.stringify(event.data));
      }
    },
    onError(error) {
      console.error("Subscription error:", error);
      setLatestMessage("Error: Connection failed");
    },
  });

  // Send test message
  const ping = api.notifications.ping.useMutation();

  const sendTestMessage = () => {
    ping.mutate(
      { message: `Test message at ${new Date().toLocaleTimeString()}` },
      {
        onSuccess: () => {
          console.log("Test message sent successfully");
        },
        onError: (error) => {
          console.error("Failed to send test message:", error);
        },
      }
    );
  };

  const toggleConnection = () => {
    setIsConnected((prev) => {
      if (prev) {
        setLatestMessage("No messages yet");
      }
      return !prev;
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Server-Sent Events (SSE) Mock UI
        </h1>
        <p className="text-gray-600 mb-6">
          Simple demonstration of real-time SSE notifications with connection management and message display.
        </p>

        {/* Connection Status */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-4">
            <Button onClick={toggleConnection} variant={isConnected ? "destructive" : "default"}>
              {isConnected ? "Disconnect" : "Connect to SSE"}
            </Button>
            <div className={cn(
              "px-3 py-1 rounded-full text-sm font-medium",
              isConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            )}>
              {isConnected ? "Connected" : "Disconnected"}
            </div>
          </div>
        </div>

        {/* Test Button */}
        {isConnected && (
          <div className="mb-6">
            <Button 
              onClick={sendTestMessage}
              disabled={ping.isPending}
              variant="secondary"
              className="w-full"
            >
              {ping.isPending ? "Sending..." : "Send Test Message"}
            </Button>
          </div>
        )}

        {/* Latest Message Display */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">
            Latest SSE Message:
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 min-h-[100px]">
            <p className="text-gray-700 break-words">
              {latestMessage}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
/**
 * @fileoverview SSE Client Component
 *
 * This component demonstrates SSE functionality by:
 * - Establishing a connection to the SSE endpoint
 * - Listening for various event types (message, ping, etc.)
 * - Displaying received messages in a scrollable container
 * - Providing UI for testing individual and broadcast messages
 *
 * This is a mock UI component to prove SSE functionality as required.
 * In a real application, this would be integrated into the main UI.
 *
 * Features:
 * - Real-time message display with scrollable history
 * - Individual message sending to specific users
 * - Broadcast message sending to all connected clients
 * - Connection status monitoring and error handling
 * - Clean connection cleanup on component unmount
 */

"use client";

import { useEffect, useState } from "react";

/**
 * Props interface for the SSE Client component
 */
type Props = {
  /** Unique identifier for the user/session */
  userId: string;
};

/**
 * SSE Client Component
 *
 * Establishes an SSE connection and provides UI for testing SSE functionality.
 * This component serves as a demonstration of the SSE system capabilities.
 *
 * @param userId - Unique identifier for the user/session
 * @returns JSX element with SSE testing interface
 *
 * @example
 * ```tsx
 * <SSEClient userId="user123" />
 * ```
 */
export const SSEClient = ({ userId }: Props) => {
  /** Array of received messages for display */
  const [message, setMessage] = useState<string[]>([]);

  /** Input value for individual message sending */
  const [input, setInput] = useState<string>("");

  /** Input value for broadcast message sending */
  const [broadcastInput, setBroadcastInput] = useState<string>("");

  /**
   * Establish SSE connection and set up event listeners
   *
   * This effect runs when the component mounts or userId changes.
   * It creates an EventSource connection and listens for various event types.
   */
  useEffect(() => {
    // Create EventSource connection to the SSE endpoint
    const eventSource = new EventSource(`/api/sse?userId=${userId}`);

    /**
     * Handle default message events
     * These are events without a specific event name
     */
    eventSource.onmessage = (event) => {
      console.log("Default message event:", event.data);
    };

    /**
     * Handle named 'message' events
     * These are explicitly named message events from the server
     */
    eventSource.addEventListener("message", (event) => {
      console.log("Named message event:", event.data);
      setMessage((prev) => [...prev, event.data as string]);
    });

    /**
     * Handle ping events from heartbeat mechanism
     * These keep the connection alive and can be used for connection monitoring
     */
    eventSource.addEventListener("ping", (event) => {
      console.log(
        `ping from server at ${new Date(parseInt(event.data as string)).toLocaleTimeString()}`,
      );
    });

    /**
     * Handle connection errors
     * Logs errors and closes the connection to prevent hanging
     */
    eventSource.onerror = (err) => {
      console.error("SSE error:", err);
      eventSource.close();
    };

    /**
     * Cleanup function - called when component unmounts or userId changes
     * Ensures proper connection cleanup to prevent memory leaks
     */
    return () => {
      eventSource.close();
    };
  }, [userId]);

  console.log(message);

  /**
   * Send individual message to specific user
   *
   * Makes a POST request to the trigger endpoint to send a message
   * to the current user via the SSE manager.
   */
  const handleTrigger = async () => {
    await fetch("/api/sse/trigger", {
      method: "POST",
      body: JSON.stringify({ userId, message: input }),
    });
  };

  /**
   * Send broadcast message to all connected clients
   *
   * Makes a POST request to the broadcast endpoint to send a message
   * to all connected clients via the SSE manager.
   */
  const handleBroadcast = async () => {
    await fetch("/api/sse/broadcast", {
      method: "POST",
      body: JSON.stringify({ message: broadcastInput }),
    });
  };

  return (
    <div className="w-3/4">
      {/* Message display section */}
      <p className="font-bold">Server Messages:</p>
      <div className="flex h-[300px] flex-col gap-2 overflow-y-auto rounded-md border-2 border-gray-300 p-2">
        {message.map((msg, index) => (
          <div key={index}>{msg}</div>
        ))}
      </div>

      {/* Individual message sending section */}
      <div className="mt-4 flex flex-col">
        <input
          className="rounded-md border-2 border-gray-300 p-2"
          type="text"
          placeholder="Enter message to send"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          className="mt-4 rounded-md bg-blue-500 p-2 text-white"
          onClick={handleTrigger}
        >
          Send message
        </button>

        {/* Broadcast message sending section */}
        <div className="mt-4 flex flex-col">
          <input
            className="rounded-md border-2 border-gray-300 p-2"
            type="text"
            placeholder="Enter message to broadcast"
            value={broadcastInput}
            onChange={(e) => setBroadcastInput(e.target.value)}
          />
          <button
            className="mt-4 rounded-md bg-green-500 p-2 text-white"
            onClick={handleBroadcast}
          >
            Send broadcast
          </button>
        </div>
      </div>
    </div>
  );
};

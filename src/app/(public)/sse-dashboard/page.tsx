"use client";
import type { IApiResponse, IDropdownInputOption } from "@/types/sse";
import useSSE from "../../../features/sse/hooks/useSSE";
import { useEffect, useState } from "react";
import DropdownInput from "../../../features/sse/components/DropdownInput";
import { cn } from "../../../features/shared/utils";
import MultiSelectDropdown from "../../../features/sse/components/MultiSelectDropdown";
import { Button } from "../../../features/shared/components/ui/button";

const SseDashboard = () => {
  const [connectionId, setConnectionId] = useState("");
  const [userId, setUserId] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<IDropdownInputOption>({
    id: "notification",
    label: "Notification",
  });
  const [userIds, setUserIds] = useState<IDropdownInputOption[]>([]);
  const [allUsers, setAllUsers] = useState<IDropdownInputOption[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const {
    isConnectionRunning,
    eventHistory,
    clearEventHistory,
    establishConnection,
    triggerEvent,
    killConnection,
  } = useSSE({ connectionId, userId });

  const getUniqueId = () => {
    // generates unique connection ID for backend to establish and handle a connection
    return Math.random().toString(36).substring(2, 12);
  };

  const getAllUsers = async () => {
    try {
      const res: Response = await fetch("/api/sse/stats", {
        method: "get",
        headers: { "Content-Type": "application/json" },
      });

      const result: IApiResponse = (await res.json()) as IApiResponse;

      setAllUsers(
        result.data?.connectedUserIds?.map((user: string) => ({
          id: user,
          label: user,
          isSelected: false,
        })) ?? []
      );
    } catch (e) {
      console.log(e);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    establishConnection();

    setTimeout(() => {
      setIsConnecting(false);
      void getAllUsers();
    }, 2000);
  };

  const handleMessageSubmit = async () => {
    setIsSendingMessage(true);
    const usersList = userIds.map((user: IDropdownInputOption) => user.id);

    await triggerEvent({
      type: messageType.id,
      message: message,
      userIds: usersList,
    });

    setMessage("");
    setUserIds([]);
    setIsSendingMessage(false);
  };

  useEffect(() => {
    void getAllUsers();

    return () => killConnection();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            SSE Dashboard
          </h1>
          <p className="mt-2 text-gray-600">
            Real-time event streaming control panel
          </p>
        </div>

        {/* Connection Setup */}
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Connection
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                User ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter User ID"
                  value={userId}
                  onChange={(e) => {
                    if (e.target.value.length <= 24) setUserId(e.target.value);
                  }}
                  disabled={isConnectionRunning}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-500"
                />
                {!isConnectionRunning && (
                  <button
                    onClick={() => setUserId(getUniqueId())}
                    className="absolute top-1/2 right-2 -translate-y-1/2 text-xs text-blue-600 transition-colors hover:text-blue-800"
                  >
                    Auto
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Connection ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter Connection ID"
                  value={connectionId}
                  onChange={(e) => {
                    if (e.target.value.length <= 24)
                      setConnectionId(e.target.value);
                  }}
                  disabled={isConnectionRunning}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-500"
                />
                {!isConnectionRunning && (
                  <button
                    onClick={() => setConnectionId(getUniqueId())}
                    className="absolute top-1/2 right-2 -translate-y-1/2 text-xs text-blue-600 transition-colors hover:text-blue-800"
                  >
                    Auto
                  </button>
                )}
              </div>
            </div>

            <div className="pt-2">
              <Button
                onClick={isConnectionRunning ? killConnection : handleConnect}
                disabled={!connectionId || !userId || isConnecting}
                className={cn(
                  "w-full rounded-md px-6 py-2 font-medium transition-colors sm:w-auto",
                  isConnectionRunning
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                )}
              >
                {isConnectionRunning
                  ? "Disconnect"
                  : isConnecting
                  ? "Connecting..."
                  : "Connect"}
              </Button>
            </div>
          </div>
        </div>

        {/* Event Sender */}
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Send Events
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Event Type
              </label>
              <DropdownInput
                options={[
                  { id: "notification", label: "Notification" },
                  { id: "broadcast", label: "Broadcast" },
                  { id: "maintenance", label: "Maintenance" },
                ]}
                selected={messageType}
                onSelect={setMessageType}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Target Users
              </label>
              <MultiSelectDropdown
                options={allUsers}
                selected={userIds}
                setSelected={setUserIds}
                placeHolder="Select users to notify"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Message
              </label>
              <textarea
                placeholder="Enter your message..."
                value={message}
                onChange={(e) => {
                  if (e.target.value.length <= 500) setMessage(e.target.value);
                }}
                rows={3}
                className="w-full resize-none rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="pt-2">
              <Button
                onClick={handleMessageSubmit}
                disabled={!isConnectionRunning || !message || isSendingMessage}
                className="w-full rounded-md bg-green-600 px-6 py-2 font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {isSendingMessage ? "Sending..." : "Send Event"}
              </Button>
            </div>
          </div>
        </div>

        {/* Event Log */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Event Log</h2>
            {eventHistory?.length > 0 && (
              <button
                onClick={clearEventHistory}
                className="text-sm text-gray-500 transition-colors hover:text-gray-700"
              >
                Clear
              </button>
            )}
          </div>

          {eventHistory?.length > 0 ? (
            <div className="max-h-64 space-y-3 overflow-y-auto">
              {eventHistory.map((item, index) => (
                <div
                  key={index}
                  className="rounded-md border border-gray-200 bg-gray-50 p-3"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-sm text-blue-600">▶</span>
                    <pre className="font-mono text-xs break-words text-gray-700">
                      {JSON.stringify(item, null, 2)}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">
              <div className="mb-2 text-4xl">📡</div>
              <p>No events logged yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SseDashboard;

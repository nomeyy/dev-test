"use client";
import type {
  IApiResponse,
  IDropdownInputOption,
  IEventHistory,
} from "@/types/sse";
import useSSE from "../../../features/sse/hooks/useSSE";
import { useEffect, useState } from "react";
import DropdownInput from "../../../features/sse/components/DropdownInput";
import { cn } from "@/shared/utils";
import MultiSelectDropdown from "../../../features/sse/components/MultiSelectDropdown";

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

  const handleConnect = async () => {
    await getAllUsers();
    establishConnection();
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
        })) ?? [],
      );
    } catch (e) {
      console.log(e);
    }
  };

  const handleMessageSubmit = async () => {
    setMessage("");
    const usersList = userIds.map((user:IDropdownInputOption)=>user.id)
    await triggerEvent({
      type: messageType.id,
      message: message,
      userIds: usersList,
    });
  };

  useEffect(() => {
    void getAllUsers();

    return () => killConnection();
  }, []);

  return (
    <div className="w-full max-w-[800px]">
      <h1 className="mb-[28px] text-center text-[42px] font-bold">
        SSE Dashboard
      </h1>

      {/* connection configuration */}
      <div className="mb-6 rounded-[12px] bg-white p-[24px]">
        <h3 className="mb-[10px] text-[20px] font-bold text-black">
          Set Up Your Connection
        </h3>
        <div className="mb-[10px] flex items-center justify-between gap-[20px]">
          {/* generate user id */}
          <div className="relative flex-1">
            <label htmlFor="userId" className="block text-lg text-black">
              User ID
            </label>
            <input
              type="text"
              id="userId"
              placeholder="Enter User ID"
              value={userId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                if (e.target.value.length <= 24) setUserId(e.target.value);
              }}
              disabled={isConnectionRunning}
              className={`block w-full rounded-lg border border-[#c3c3c3] px-4 py-2 text-black ${isConnectionRunning ? "bg-[#d5d5d5]" : ""}`}
            />
            {!isConnectionRunning && (
              <button
                className="absolute top-[40px] right-4 cursor-pointer text-[12px] text-black underline"
                onClick={() => setUserId(getUniqueId)}
              >
                Auto Generate
              </button>
            )}
          </div>

          {/* generate connection id */}
          <div className="relative flex-1">
            <label htmlFor="connectionId" className="block text-lg text-black">
              Connection ID
            </label>
            <input
              type="text"
              id="connectionId"
              placeholder="Enter Connection ID"
              value={connectionId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                if (e.target.value.length <= 24)
                  setConnectionId(e.target.value);
              }}
              disabled={isConnectionRunning}
              className={`block w-full rounded-lg border border-[#c3c3c3] px-4 py-2 text-black ${isConnectionRunning ? "bg-[#d5d5d5]" : ""}`}
            />
            {!isConnectionRunning && (
              <button
                className="absolute top-[40px] right-4 cursor-pointer text-[12px] text-black underline"
                onClick={() => setConnectionId(getUniqueId())}
              >
                Auto Generate
              </button>
            )}
          </div>
        </div>
        <button
          className={cn(
            "w-36 rounded-[24px] px-3 py-1 text-white",
            connectionId && userId
              ? isConnectionRunning
                ? "cursor-pointer bg-[#f11b1b]"
                : "cursor-pointer bg-[#458e45]"
              : "bg-[#7d7d7d]",
          )}
          onClick={isConnectionRunning ? killConnection : handleConnect}
          disabled={!connectionId}
        >
          {isConnectionRunning ? "Disconnect" : "Connect"}
        </button>
      </div>

      {/* Trigger custom events */}
      <div className="mb-6 rounded-[12px] bg-white p-[24px]">
        <h3 className="mb-[10px] text-[20px] font-bold text-black">
          Send Custom Events
        </h3>
        <label className="block text-lg text-black">Event Type</label>
        <DropdownInput
          options={[
            { id: "notification", label: "Notification" },
            { id: "broadcast", label: "Broadcast" },
            { id: "maintenance", label: "Maintenance" },
          ]}
          selected={messageType}
          onSelect={(item: IDropdownInputOption) => setMessageType(item)}
          className="mb-4"
        />
        <label className="block text-lg text-black">Event Type</label>
        <MultiSelectDropdown
          options={allUsers}
          selected={userIds}
          setSelected={setUserIds}
          className="mb-4"
          placeHolder="Select User IDs"
        />
        <div className="relative">
          <label htmlFor="message" className="block text-lg text-black">
            Message
          </label>
          <textarea
            id="message"
            placeholder="Enter message"
            value={message}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
              if (e.target.value.length <= 500) setMessage(e.target.value);
            }}
            className="mb-4 block w-[480px] rounded-lg border border-[#c3c3c3] px-4 py-2 text-black"
          />
          <button
            className={cn(
              "w-36 rounded-[24px] px-3 py-1 text-white",
              isConnectionRunning
                ? "cursor-pointer bg-[#458e45]"
                : "bg-[#7d7d7d]",
            )}
            onClick={handleMessageSubmit}
            disabled={!isConnectionRunning || !message}
          >
            Send
          </button>
        </div>
      </div>

      {/* Event History */}
      <div className="mb-6 rounded-[12px] bg-white p-[24px]">
        <div className="flex items-center justify-between">
          <h3 className="mb-[10px] text-[20px] font-bold text-black">
            Event Log
          </h3>
          {eventHistory?.length > 0 && (
            <button
              className="cursor-pointer text-black underline"
              onClick={clearEventHistory}
            >
              Clear Log
            </button>
          )}
        </div>
        {eventHistory?.length > 0 ? (
          <ul className="max-h-[280px] overflow-auto">
            {eventHistory?.map((item: IEventHistory, index: number) => (
              <li
                key={`eventHistory_item_${index}`}
                className="mb-6 flex gap-x-1 text-black"
              >
                {">>"}
                <pre>{JSON.stringify(item, null, 2)}</pre>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-black">No logs to show</p>
        )}
      </div>
    </div>
  );
};

export default SseDashboard;

"use client";

import { Button } from "@/shared/components/ui/button";
import { api } from "@/trpc/react";
import type { Session } from "next-auth";
import { useState, useCallback, useRef } from "react";
import { useSSEConnection } from "../hooks/useSSEConnection";
import ClientList from "./ClientList";
import { Input } from "@/shared/components/ui/input";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Label } from "@/shared/components/ui/label";

interface NotificationDisplayProps {
  user: Session["user"];
}

export default function NotificationDisplay({
  user,
}: NotificationDisplayProps) {
  const [eventName, setEventName] = useState("");
  const [payload, setPayload] = useState("");
  const [broadcast, setBroadcast] = useState<boolean>(false);
  const sendNotification = api.notifications.notification.useMutation();

  const { connectionStatus, connectedClients, messages } = useSSEConnection();

  const messageListRef = useRef<HTMLUListElement>(null);

  const handleSendNotification = useCallback(
    (targetClientId?: string) => {
      if (!eventName.trim()) return alert("Event name cannot be empty");

      sendNotification.mutate({
        clientId: broadcast ? undefined : targetClientId,
        eventType: eventName,
        payload: {
          message: `${broadcast ? "Broadcast" : "Notification"} from ${user?.name} : ${payload}`,
        },
      });

      setEventName("");
      setPayload("");
      setBroadcast(false);
    },
    [eventName, payload, broadcast, sendNotification, user?.name],
  );

  return (
    <div className="flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="w-xl space-y-6 rounded-xl bg-white p-6 shadow-lg">
        <h1 className="text-center text-2xl font-bold text-gray-800">
          Real-Time Notifications
        </h1>
        <p className="text-sm text-gray-600">
          Status:{" "}
          <span
            className={
              connectionStatus === "Connected"
                ? "text-green-600"
                : "text-red-600"
            }
          >
            {connectionStatus}
          </span>
        </p>

        {/* Notification Form */}
        <div className="space-y-4 rounded-lg bg-gray-50 p-4">
          <Label className="text-gray-600">Event Name</Label>
          <Input
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="Enter event name"
          />

          <Label className="text-gray-600">Payload</Label>
          <Input
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            placeholder="Enter payload message"
          />

          <Label className="text-gray-600">Broadcast to all clients</Label>
          <Checkbox
            checked={broadcast}
            onCheckedChange={(checked) => {
              if (typeof checked === "boolean") {
                setBroadcast(checked);
              } else {
                setBroadcast(false);
              }
            }}
          />

          {!broadcast ? (
            <ClientList
              clients={connectedClients}
              currentUserId={user?.id}
              currentUserName={user?.name ?? ""}
              onSend={handleSendNotification}
              disabled={connectionStatus !== "Connected"}
            />
          ) : (
            <Button
              onClick={() => handleSendNotification()}
              className="w-full"
              disabled={connectionStatus !== "Connected"}
            >
              Broadcast Notification
            </Button>
          )}
        </div>

        {/* Messages */}
        <div className="rounded-lg bg-gray-50 p-4">
          <h2 className="mb-2 text-lg font-semibold text-gray-700">Messages</h2>
          {messages.length === 0 ? (
            <p className="text-gray-500">No messages yet...</p>
          ) : (
            <ul ref={messageListRef} className="h-64 space-y-2 overflow-y-auto">
              {messages.map((msg, index) => (
                <li
                  key={index}
                  className="rounded bg-white p-2 text-sm text-gray-600 shadow-sm"
                >
                  <b className="capitalize">{msg.type}</b>
                  {msg.message && <p>{msg.message}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

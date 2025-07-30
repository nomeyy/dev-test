"use client";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { api } from "@/trpc/react";
import { useState } from "react";

export const NotificationsDemo = () => {
  const notifications = api.notifications.list.useSubscription();
  const ping = api.notifications.pingAll.useMutation();
  const [message, setMessage] = useState("");
  const [subId, setSubId] = useState("");
  return (
    <div>
      <div>{JSON.stringify(notifications.data)}</div>
      <div className="max-w-sm space-y-1">
        <p className="text-sm font-medium">Ping message</p>
        <Input value={message} onChange={(e) => setMessage(e.target.value)} />
        <Button
          onClick={() => {
            ping.mutate({ message });
          }}
          variant="secondary"
          className="mb-2"
        >
          Ping everyone
        </Button>
        <p className="text-sm font-medium">Ping specific sub</p>
        <Input value={subId} onChange={(e) => setSubId(e.target.value)} />
        <Button
          onClick={() => {
            ping.mutate({ message, subIds: [subId] });
          }}
          variant="secondary"
        >
          Ping specific sub
        </Button>
      </div>
    </div>
  );
};

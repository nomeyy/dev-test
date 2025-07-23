"use client";

import { useEffect, useState } from "react";
import { api } from "@/trpc/react";
import { z } from "zod";
import { useSearchParams } from "next/navigation";
import { Button } from "@/shared/components/ui/button";

const JobUpdateSchema = z.object({ status: z.string() });
const SystemNotifySchema = z.object({ message: z.string() });

export function SseTestUI() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId") ?? "123";

  const [connected, setConnected] = useState<boolean>(false);
  const [latestMsg, setLatestMsg] = useState<string>("none");
  const [broadcastMsg, setBroadcastMsg] = useState<string>("none");

  const sendTestEvent = api.sse.sendTestEvent.useMutation();
  const broadcastMessage = api.sse.broadcastSystemMessage.useMutation();

  useEffect(() => {
    const source = new EventSource(`/api/sse/user-${userId}`);

    const handleInit = (e: MessageEvent<string>) => {
      if (e.data === "connected") {
        setConnected(true);
      }
    };

    const handleJobUpdate = (e: MessageEvent<string>) => {
      const parsed = JobUpdateSchema.safeParse(JSON.parse(e.data));
      if (parsed.success) {
        setLatestMsg(parsed.data.status);
      } else {
        console.error("Invalid job-update payload", parsed.error);
      }
    };

    const handleSystemNotify = (e: MessageEvent<string>) => {
      const parsed = SystemNotifySchema.safeParse(JSON.parse(e.data));
      if (parsed.success) {
        setBroadcastMsg(parsed.data.message);
      } else {
        console.error("Invalid system-notify payload", parsed.error);
      }
    };

    source.addEventListener("job-update", handleJobUpdate);
    source.addEventListener("system-notify", handleSystemNotify);
    source.addEventListener("init", handleInit);

    return () => {
      source.removeEventListener("init", handleInit);
      source.removeEventListener("job-update", handleJobUpdate);
      source.removeEventListener("system-notify", handleSystemNotify);
      source.close();
    };
  }, [userId]);

  return (
    <div className="flex flex-col items-center justify-center space-y-4 rounded border p-6 text-center">
      <p className={connected ? "text-green-600" : "text-gray-500"}>
        {connected ? "Connected" : "Connecting..."}
      </p>
      <div className="flex flex-col items-center justify-center space-y-2">
        <Button
          disabled={!connected}
          variant="default"
          className="rounded bg-blue-600 px-4 py-2 text-white"
          onClick={() => sendTestEvent.mutate({ userId })}
        >
          Send Test Event
        </Button>

        <div className="text-sm text-gray-700">
          Latest Message: <span className="font-mono">{latestMsg}</span>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center space-y-2">
        <Button
          disabled={!connected}
          variant="secondary"
          className="rounded bg-yellow-500 px-4 py-2 text-white"
          onClick={() =>
            broadcastMessage.mutate({
              message: "🚨 System-wide broadcast from admin!",
            })
          }
        >
          Send Broadcast Message
        </Button>

        <div className="text-sm text-gray-700">
          Broadcast Message: <span className="font-mono">{broadcastMsg}</span>
        </div>
      </div>
    </div>
  );
}

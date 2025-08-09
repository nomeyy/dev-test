"use client";
import type {
  IApiResponse,
  IEventHistory,
  IMessageResponse,
} from "@/types/sse";
import { useRef, useState } from "react";

const useSSE = ({
  connectionId,
  userId,
}: {
  connectionId: string;
  userId: string;
}) => {
  const eventSourceRef = useRef<EventSource | null>(null);
  const [isConnectionRunning, setIsConnectionRunning] = useState(false);
  const [eventHistory, setEventHistory] = useState<IEventHistory[]>([]);

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour12: false, // 24-hour format; set to true if you want AM/PM
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const updateEventHistory = (connectionId: string, message: string) => {
    let msg: unknown;

    try {
      msg = JSON.parse(message);
    } catch (e) {
      console.log(e);
      msg = message;
    }

    setEventHistory((prev) => [
      {
        time: getCurrentTime(),
        message: msg,
        connectionId: connectionId,
        status: true,
      },
      ...prev,
    ]);
  };

  const establishConnection = () => {
    const requestUrl = `/api/sse?clientId=${connectionId}&userId=${userId}`;
    const eveSource = new EventSource(requestUrl);
    eventSourceRef.current = eveSource;

    eveSource.onopen = () => {
      setIsConnectionRunning(true);

      setEventHistory((prev) => [
        {
          time: getCurrentTime(),
          message: "Connection established successfully",
          connectionId: connectionId,
          status: true,
        },
        ...prev,
      ]);
    };

    eveSource.onerror = () => {
      setIsConnectionRunning(false);
      setEventHistory((prev) => [
        {
          time: getCurrentTime(),
          message: "Connection establish failed",
          connectionId: connectionId,
          status: true,
        },
        ...prev,
      ]);
    };

    eveSource.addEventListener("notification", (data: MessageEvent) => {
      const response: IMessageResponse = JSON.parse(
        (data?.data as string) ?? ""
      ) as IMessageResponse;

      updateEventHistory(connectionId, response?.message);
    });

    eveSource.addEventListener("broadcast", (data: MessageEvent) => {
      const response: IMessageResponse = JSON.parse(
        (data?.data as string) ?? ""
      ) as IMessageResponse;

      updateEventHistory(connectionId, response?.message);
    });

    eveSource.addEventListener("maintenance", (data: MessageEvent) => {
      const response: IMessageResponse = JSON.parse(
        (data?.data as string) ?? ""
      ) as IMessageResponse;

      updateEventHistory(connectionId, response?.message);
    });

    eveSource.addEventListener("ping", () => {
      setEventHistory((prev) => [
        {
          time: getCurrentTime(),
          message: "Ping detected",
          connectionId: connectionId,
        },
        ...prev,
      ]);
    });
  };

  const clearEventHistory = () => {
    setEventHistory([]);
  };

  const triggerEvent = async (payload: {
    type: string;
    message: string;
    userIds?: string[];
  }) => {
    try {
      const res: Response = await fetch("api/sse/send", {
        method: "post",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      (await res.json()) as IApiResponse;
    } catch (e) {
      return { success: false, msg: e };
    }
  };

  const killConnection = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnectionRunning(false);
    setEventHistory((prev) => [
      {
        time: getCurrentTime(),
        message: "Connection terminated",
        connectionId: connectionId,
      },
      ...prev,
    ]);
  };

  return {
    isConnectionRunning,
    eventHistory,
    establishConnection,
    triggerEvent,
    killConnection,
    clearEventHistory,
  };
};

export default useSSE;

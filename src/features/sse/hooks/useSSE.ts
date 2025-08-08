"use client";
import type {
  IApiResponse,
  IDropdownInputOption,
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
  const lastPing = useRef<number>(Date.now());

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour12: false, // 24-hour format; set to true if you want AM/PM
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const establishConnection = () => {
    const requestUrl = `/api/sse?clientId=${connectionId}&userId=${userId}`;
    const eveSource = new EventSource(requestUrl);
    eventSourceRef.current = eveSource;

    eveSource.onopen = () => {
      lastPing.current = Date.now();
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

    eveSource.addEventListener("notification", () => {
      lastPing.current = Date.now();
      setEventHistory((prev) => [
        {
          time: getCurrentTime(),
          message: "Ping detected",
          connectionId: connectionId,
        },
        ...prev,
      ]);
    });

    eveSource.addEventListener("broadcast", () => {
      lastPing.current = Date.now();
      setEventHistory((prev) => [
        {
          time: getCurrentTime(),
          message: "Ping detected",
          connectionId: connectionId,
        },
        ...prev,
      ]);
    });

    eveSource.addEventListener("maintenance", (data: MessageEvent) => {
      const response: IMessageResponse = JSON.parse(
        (data?.data as string) ?? "",
      ) as IMessageResponse;
      lastPing.current = Date.now();
      setEventHistory((prev) => [
        {
          time: getCurrentTime(),
          message: response?.message,
          connectionId: connectionId,
        },
        ...prev,
      ]);
    });

    eveSource.addEventListener("ping", () => {
      lastPing.current = Date.now();
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
    userId?: IDropdownInputOption[];
  }) => {
    try {
      const res: Response = await fetch("api/sse/send", {
        method: "post",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result: IApiResponse = (await res.json()) as IApiResponse;

      setEventHistory((prev) => [
        {
          time: getCurrentTime(),
          message: result?.details?.message,
          connectionId: connectionId,
          status: true,
        },
        ...prev,
      ]);
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

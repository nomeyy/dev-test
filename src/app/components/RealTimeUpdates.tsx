"use client";
// components/RealTimeUpdates.tsx
import { useSSE } from "@/hooks/useSSE";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

export function RealTimeUpdates() {
  const [updates, setUpdates] = useState<any[]>([]);
  const { clientId, addEventHandler, removeEventHandler } = useSSE();

  useEffect(() => {
    const handleNotification = (data: any) => {
      toast.success(data.message);
      setUpdates((prev) => [...prev, { type: "notification", ...data }]);
    };

    const handleUpdate = (data: any) => {
      setUpdates((prev) => [...prev, { type: "update", ...data }]);
    };

    addEventHandler("notification", handleNotification);
    addEventHandler("update", handleUpdate);

    return () => {
      removeEventHandler("notification");
      removeEventHandler("update");
    };
  }, [addEventHandler, removeEventHandler]);

  return (
    <div className="fixed right-4 bottom-4 w-72 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
      <h3 className="mb-2 font-bold">Real-Time Updates</h3>
      <div className="mb-2 text-xs">Client ID: {clientId}</div>

      <div className="max-h-60 space-y-2 overflow-y-auto">
        {updates.map((update, index) => (
          <div key={index} className="border-b border-gray-100 p-2 text-sm">
            <div className="font-medium">{update.type}</div>
            <div>{update.message || JSON.stringify(update)}</div>
            <div className="text-xs text-gray-500">
              {new Date(update.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

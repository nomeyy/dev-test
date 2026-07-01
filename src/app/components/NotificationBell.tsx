"use client";
// components/NotificationBell.tsx
import { useSSE } from "@/hooks/useSSE";
import { useEffect, useState } from "react";

export function NotificationBell() {
  const [count, setCount] = useState(0);
  const { addEventHandler, removeEventHandler } = useSSE();

  useEffect(() => {
    addEventHandler("notification", (data) => {
      setCount((prev) => prev + 1);
      // Could also show a toast here
    });

    return () => {
      removeEventHandler("notification");
    };
  }, [addEventHandler, removeEventHandler]);

  return (
    <button className="relative">
      {/* <BellIcon /> */}
      {count > 0 && (
        <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
          {count}
        </span>
      )}
    </button>
  );
}

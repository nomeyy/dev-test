"use client";
import { useTransition } from "react";

export default function TriggerSSE() {
  const [isPending, startTransition] = useTransition();

  const handleClick = async () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/sse-trigger", { method: "POST" });
        if (!res.ok) {
          throw new Error(`Server responded with ${res.status}`);
        }
        console.log("✅ Broadcast triggered successfully");
      } catch (err) {
        console.error("❌ Failed to trigger SSE broadcast:", err);
        alert("Broadcast failed. Check console for error.");
      }
    });
  };

  return (
    <button
      onClick={handleClick}
      className="mt-2 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
    >
      {isPending ? "Sending..." : "Send SSE Broadcast"}
    </button>
  );
}

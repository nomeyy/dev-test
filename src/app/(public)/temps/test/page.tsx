"use client";
import { useEffect, useState } from "react";

export default function SSETest() {
  useEffect(() => {
    const evtSource = new EventSource("/api/sse?id=test-user-1");
    evtSource.addEventListener("ping", () => {});
    return () => evtSource.close();
  }, []);

  return (
    <div>
      <button
        onClick={async () => fetch("/api/sse-test-push")}
        style={{
          padding: "10px 20px",
          backgroundColor: "#4CAF50",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "16px",
          transition: "background-color 0.3s",
        }}
      >
        Send event
      </button>
    </div>
  );
}

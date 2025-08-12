"use client";
import { useState, useEffect, useRef } from "react";

type EventItem = {
  type: string;
  data: string;
};

export default function Home() {
  const [email, setEmail] = useState<string>("");
  const [pw, setPw] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const [events, setEvents] = useState<EventItem[]>([]);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    return () => {
      if (esRef.current) esRef.current.close();
    };
  }, []);

  const login = async () => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password: pw }),
      headers: { "Content-Type": "application/json" },
    });

    const j: { token?: string; [key: string]: any } = await res.json();

    if (j.token) {
      setToken(j.token);
      alert("logged in, now click Connect SSE");
    } else {
      alert(JSON.stringify(j));
    }
  };

  const connectSSE = () => {
    if (!token) return alert("login first");

    if (esRef.current) esRef.current.close();

    const url = "/api/sse/connect?token=" + encodeURIComponent(token);
    const es2 = new EventSource(url);

    console.log(es2);
    es2.onmessage = (e: MessageEvent) => {
      setEvents((prev) =>
        [{ type: "message", data: String(e.data) }, ...prev].slice(0, 50),
      );
    };

    es2.addEventListener("connected", (e: MessageEvent) => {
      setEvents((prev) => [
        { type: "connected", data: String(e.data) },
        ...prev,
      ]);
    });

    es2.addEventListener("notification", (e: MessageEvent) => {
      setEvents((prev) => [
        { type: "notification", data: String(e.data) },
        ...prev,
      ]);
    });

    es2.addEventListener("private-message", (e: MessageEvent) => {
      setEvents((prev) => [
        { type: "private-message", data: String(e.data) },
        ...prev,
      ]);
    });

    esRef.current = es2;
  };

  return (
    <main style={{ padding: 20 }}>
      <h1>Next.js SSE demo</h1>
      <div style={{ marginBottom: 10 }}>
        <input
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ marginRight: 5 }}
        />
        <input
          placeholder="password"
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          style={{ marginRight: 5 }}
        />
        <button
          onClick={login}
          style={{
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            padding: "6px 12px",
            marginRight: 5,
            cursor: "pointer",
            borderRadius: 4,
          }}
        >
          Login
        </button>
        <button
          onClick={connectSSE}
          style={{
            backgroundColor: "#2196F3",
            color: "white",
            border: "none",
            padding: "6px 12px",
            cursor: "pointer",
            borderRadius: 4,
          }}
        >
          Connect SSE
        </button>
      </div>
      <div>
        <h3>Events</h3>
        <ul>
          {events.map((ev, i) => (
            <li key={i}>
              <strong>{ev.type}:</strong> {ev.data}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

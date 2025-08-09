"use client";

import { useEffect, useState } from "react";

export default function BroadcastPanel() {
  const [eventName, setEventName] = useState("");
  const [payload, setPayload] = useState("");

  const [mainOption, setMainOption] = useState("Broadcast");
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");

  const sendEvent = async () => {
    await fetch("/api/sse/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetId: mainOption === "Broadcast" ? null : selectedUserId,
        eventName: mainOption === "Broadcast" ? "broadcast" : eventName,
        payload: payload || "{}",
      }),
    });

    setEventName("");
    setPayload("");
    setMainOption("Broadcast");
    setSelectedUserId("");
  };

  const fetchUsers = async () => {
    const res = await fetch("/api/users", { method: "GET" });
    setUsers(await res.json());
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="w-100 p-4">
      <h1 className="mb-4 text-xl font-bold">Stream New Event</h1>

      <select
        id="event-select"
        value={mainOption}
        onChange={(e) => setMainOption(e.target.value)}
        className="mb-2 w-full rounded-sm border bg-white p-2 text-black"
      >
        <option value="Broadcast" className="bg-white text-black">
          Broadcast
        </option>
        <option value="User" className="bg-white text-black">
          User
        </option>
      </select>

      {mainOption === "User" && (
        <select
          id="user-select"
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="mb-2 w-full rounded-sm border bg-white p-2 text-black"
        >
          <option value="" className="bg-white text-black">
            Select a User
          </option>
          {users.map((user: any) => (
            <option
              key={user.id}
              value={user.id}
              className="bg-white text-black"
            >
              {user.name || "Unnamed User"} -{" "}
              {user.is_connected ? "Online" : "Offline"}
            </option>
          ))}
        </select>
      )}

      {mainOption !== "Broadcast" && (
        <input
          id="event-name"
          type="text"
          placeholder="Event Name"
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
          className="mb-2 w-full rounded-sm border p-2"
        />
      )}

      <textarea
        id="payload"
        placeholder="Type your message here..."
        value={payload}
        onChange={(e) => setPayload(e.target.value)}
        className="mb-2 w-full rounded-sm border p-2"
        rows={4}
      />

      <button
        onClick={sendEvent}
        className="mb-4 w-full cursor-pointer rounded bg-green-600 px-3 py-2 text-white"
      >
        Send
      </button>
    </div>
  );
}

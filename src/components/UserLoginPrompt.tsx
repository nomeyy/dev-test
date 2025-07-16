"use client";

import { useState } from "react";

export default function UserLoginPrompt() {
  const [inputId, setInputId] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const handleLogin = () => {
    if (!inputId.trim()) return;
    setUserId(inputId.trim());
  };

  return (
    <div className="mx-auto mt-10 w-full max-w-md rounded border border-gray-200 bg-white p-4 shadow">
      {userId ? (
        <p className="text-center text-sm text-gray-700">
          Logged in as <strong>{userId}</strong>
        </p>
      ) : (
        <>
          <h2 className="mb-3 text-lg font-semibold text-gray-800">
            Enter User ID
          </h2>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputId}
              onChange={(e) => setInputId(e.target.value)}
              placeholder="e.g. demo-user"
              className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              onClick={handleLogin}
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              Login
            </button>
          </div>
        </>
      )}
    </div>
  );
}

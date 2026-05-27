"use client";

export default function SendButton({ userId }: { userId: any }) {
  const sendTestEvent = async () => {
    await fetch(`http://localhost:3000/send/${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "custom-event",
        data: { text: "Hello from server!" },
      }),
    });
  };

  return <button onClick={sendTestEvent}>Send Test Event</button>;
}

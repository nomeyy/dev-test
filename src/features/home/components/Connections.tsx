"use client";

import { Button } from "@/shared/components/ui/button";
import type { Session } from "next-auth";
import { useCallback, useEffect, useRef, useState } from "react";

type Connection = {
  clientId: string; // date string
  session: Session;
};

export const Connections = () => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const sendBroadcast = useCallback(async () => {
    fetch("/api/sse/message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: "Hello all" }),
    }).catch((error) => {
      console.error("Error sending broadcast message:", error);
    });
  }, []);

  useEffect(() => {
    const events = new EventSource("http://localhost:3000/api/sse");

    events.onmessage = (event: MessageEvent<string>) => {
      try {
        const data = JSON.parse(event.data) as {
          message?: string;
          type: string;
          sender: { clientId: string; user: { id: string; email: string } };
        };
        if (data.message) {
          alert(
            `New message from ${data.sender.user.email} at client: ${data.sender.clientId}: ${data.message}, message type: ${data.type}`,
          );
        }
        console.log("Parsed SSE Event Data:", data);
      } catch (error) {
        console.error("Error parsing SSE event data:", error);
      }
    };

    events.addEventListener("ping", (event: MessageEvent<string>) => {
      try {
        const data = JSON.parse(event.data) as { clientId: string };
        console.log("Ping event received", data);

        const clientId = data.clientId;
        if (clientId) {
          setClientId(clientId);
        }
      } catch (error) {
        console.error("Error handling ping event:", error);
      }
      fetch("/api/sse/stats")
        .then((response) => response.json())
        .then((connections: Connection[]) => {
          setConnections(connections);
        })
        .catch((error: Error) => {
          console.error("Error fetching connections:", error);
        });
    });
  }, []);

  return (
    <div>
      <h2>Active Connections</h2>
      <h2>Current Client Id: {clientId}</h2>

      <ul className="m-10">
        {connections.map((connection) => (
          <li key={connection.clientId} className="flex flex-row">
            <Connection connection={connection} />
          </li>
        ))}
      </ul>
      <Button variant="secondary" onClick={sendBroadcast}>
        Send Broadcast Message
      </Button>
    </div>
  );
};

export const Connection: React.FC<{ connection: Connection }> = ({
  connection,
}) => {
  const messageRef = useRef<HTMLInputElement>(null);

  const sendMessage = useCallback(async () => {
    const message = messageRef.current?.value;
    if (!message) return;

    fetch("/api/sse/message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ clientId: connection.clientId, message }),
    }).catch((error) => {
      console.error("Error sending message:", error);
    });
  }, [connection]);

  return (
    <span key={connection.clientId} className="flex flex-row">
      <span className="m-2 flex flex-1 flex-col">
        <span>Client ID:</span>
        <span>{connection.clientId}</span>
      </span>
      <span className="m-2 flex flex-1 flex-col">
        <span>User ID:</span>
        <span>{connection.session.user.id}</span>
      </span>
      <span className="m-2 flex flex-1 flex-col">
        <span>User Name:</span>
        <span>{connection.session.user.name}</span>
      </span>
      <span className="m-2 flex flex-1 flex-col">
        <span>User Email:</span>
        <span>{connection.session.user.email}</span>
      </span>
      <span className="m-2 flex flex-1 flex-col">
        <input
          ref={messageRef}
          className="mb-1 rounded-sm bg-white text-black"
          type="text"
          placeholder="Event Data"
        />

        <Button variant="secondary" onClick={sendMessage}>
          Send Message
        </Button>
      </span>
    </span>
  );
};

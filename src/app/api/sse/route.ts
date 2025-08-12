import { auth } from "@/features/auth/handlers";
import { Client, clients } from "@/lib/sse/SSEmanager";
import { cookies } from "next/headers";

export const GET = auth(async (req) => {
  if (!req.auth) {
    return new Response("Unauthorized", { status: 401 });
  }

  const cookiesStore = await cookies();
  let clientId = cookiesStore.get("clientId")?.value ?? "";
  if (!clientId) {
    clientId = crypto.randomUUID();
    cookiesStore.set("clientId", clientId, { secure: true });
  }

  console.log("User Id:", req.auth.user.id);
  console.log("Client ID:", clientId);
  let client = clients[clientId];

  if (!client) {
    client = new Client(clientId, req.auth);
    clients[clientId] = client;
    for (const _clientId in clients) {
      if (_clientId !== clientId) {
        clients[_clientId]?.ping();
      }
    }
    console.log("New SSE client created:", clientId);
  }

  clients[clientId] = client;

  req.signal.addEventListener("abort", () => {
    console.log("Request aborted for client:", clientId);
    client.close();
    delete clients[clientId];
  });

  return new Response(client.readable, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
    },
  });
});

// export const POST = auth(async (req) => {
//     if (!req.auth) {
//         return new Response("Unauthorized", { status: 401 });
//     }

//     const { user } = req.auth;
//     const data = await req.json();

//     // Broadcast the message to all connected clients
//     for (const clientId in clients) {
//         const client = clients[clientId];
//         client.writeData({ user, ...data });
//     }

//     return new Response("OK", { status: 200 });
// });

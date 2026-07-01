import { NextRequest } from "next/server";
interface ClientConnection {
  controller: ReadableStreamDefaultController;
  lastActive: number; // timestamp
  userId?: string;
  username?: string;
}
// Store connected clients with their controllers
export const clients = new Map<string, ClientConnection>();

// Helper function to broadcast to all clients
export function broadcastEvent(event: string, data: any) {
  clients.forEach((controller) => {
    try {
      controller.controller.enqueue(
        `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
      );
    } catch (e) {
      // Connection closed, will be cleaned up on abort
    }
  });
}

export function cleanupDeadConnections() {
  const now = Date.now();
  const deadClients: string[] = [];

  clients.forEach((client, clientId) => {
    // Consider dead if no activity for 10 seconds for quicker detection
    if (now - client.lastActive > 10000) {
      deadClients.push(clientId);
      try {
        client.controller.close();
      } catch (e) {
        console.error("Error closing dead connection:", e);
      }
    }
  });

  deadClients.forEach((clientId) => clients.delete(clientId));

  // Notify via Socket.IO that these clients are inactive (if Socket.IO is available)
  if (typeof global !== "undefined" && (global as any).io) {
    const io = (global as any).io;
    deadClients.forEach((clientId) => {
      const meta = { clientId };
      try {
        io.emit("event", {
          type: "user:inactive",
          data: meta,
          timestamp: new Date().toISOString(),
        });
      } catch {}
    });
  }
  return deadClients;
}

// Heartbeat check interval (every 5 seconds)
setInterval(cleanupDeadConnections, 5000);

export async function GET(request: NextRequest) {
  // Set SSE headers
  const headers = new Headers({
    "Content-Type": "text/event-stream",
    Connection: "keep-alive",
    "Cache-Control": "no-cache, no-transform",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  });

  // Get user ID and username from query parameters
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") || undefined;
  const username = searchParams.get("username") || undefined;

  // Use userId as clientId if available, otherwise generate random ID
  const clientId =
    userId ||
    crypto.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  // Log connection attempt with parameters
  console.log(`[SSE] New connection attempt:`, {
    clientId,
    userId: userId || "anonymous",
    username: username || "anonymous",
    url: request.url,
  });

  // Create the SSE stream
  const stream = new ReadableStream({
    start(controller) {
      // Store the client connection with metadata
      clients.set(clientId, {
        controller,
        lastActive: Date.now(),
        userId,
        username,
      });

      // Send initial connection data
      controller.enqueue(
        `data: ${JSON.stringify({
          type: "connected",
          clientId,
          userId: userId || "anonymous",
          username: username || "anonymous",
          timestamp: new Date().toISOString(),
          totalConnections: clients.size,
        })}\n\n`,
      );

      // Notify all clients about new connection
      broadcastEvent("connection-update", {
        type: "new-connection",
        clientId,
        userId: userId || "anonymous",
        username: username || "anonymous",
        totalConnections: clients.size,
      });

      console.log(`[SSE] Client connected successfully:`, {
        clientId,
        userId: userId || "anonymous",
        username: username || "anonymous",
        totalConnections: clients.size,
      });

      // Heartbeat to keep connection alive (every 3 seconds)
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(`: heartbeat\n\n`);
          const record = clients.get(clientId);
          if (record) {
            record.lastActive = Date.now();
          }
        } catch (e) {
          clearInterval(heartbeat);
        }
      }, 3000);

      // Handle client disconnection
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        const client = clients.get(clientId);
        clients.delete(clientId);
        controller.close();

        console.log(`[SSE] Client disconnected:`, {
          clientId,
          userId: client?.userId || "anonymous",
          username: client?.username || "anonymous",
          totalConnections: clients.size,
        });

        // Notify remaining clients about disconnection
        broadcastEvent("connection-update", {
          type: "disconnection",
          clientId,
          userId: client?.userId || "anonymous",
          username: client?.username || "anonymous",
          totalConnections: clients.size,
        });
        // Socket.IO notification of inactivity if available
        if (typeof global !== "undefined" && (global as any).io) {
          try {
            (global as any).io.emit("event", {
              type: "user:inactive",
              data: {
                clientId,
                userId: client?.userId,
                username: client?.username,
              },
              timestamp: new Date().toISOString(),
            });
          } catch {}
        }
      });
    },
  });

  return new Response(stream, { headers });
}

// Utility function to get current connections
export function getConnections() {
  return {
    total: clients.size,
    clients: Array.from(clients.keys()),
  };
}

// Utility function to send to specific client
export function sendToClient(clientId: string, data: any) {
  const controller = clients.get(clientId);
  if (controller) {
    try {
      controller.controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
    } catch (e) {
      // Connection already closed
      clients.delete(clientId);
    }
  }
}

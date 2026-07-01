import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as IOServer } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = process.env.PORT || 3000;
const publicBaseUrl =
  process.env.NEXTAUTH_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  `http://localhost:${port}`;

// Prepare the Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      // Basic health/handshake endpoint for Socket.IO path to avoid Next route conflicts
      if (parsedUrl.pathname && parsedUrl.pathname.startsWith("/socket.io/")) {
        // Let socket.io handle this request
      }
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  // Initialize Socket.IO
  const allowedOrigins = [
    process.env.NEXTAUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ].filter(Boolean);

  const io = new IOServer(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingTimeout: 60000,
    pingInterval: 25000,
    path: "/socket.io",
    serveClient: false,
  });

  // Socket.IO connection handling
  const users = new Map();
  const activeSockets = new Set();
  const ACTIVE_WINDOW_MS = 3000; // socket considered active if pinged within last 3s
  const PRESENCE_TICK_MS = 1000; // evaluate presence every second

  async function notifySSEPresence(update) {
    try {
      await fetch(`${publicBaseUrl}/api/sse/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: "server",
          type: "presence",
          data: update,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (e) {
      console.error("Failed to call SSE API for presence", e);
    }
  }

  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Create user record
    const user = {
      id: socket.id,
      socketId: socket.id,
      userId: socket.handshake.auth.userId,
      userEmail: socket.handshake.auth.userEmail,
      userName: socket.handshake.auth.userName,
      sessionId: socket.handshake.auth.token,
      connectedAt: new Date(),
      lastActive: new Date(),
      rooms: new Set(["general"]),
      displayName: undefined,
    };

    users.set(socket.id, user);

    // Send connection confirmation to the connecting client
    socket.emit("connected", {
      socketId: socket.id,
      timestamp: new Date(),
      totalConnections: users.size,
    });

    // Notify everyone about the new connection (normalized 'event' channel)
    io.emit("event", {
      type: "connection-update",
      data: {
        type: "new-connection",
        clientId: socket.id,
        totalConnections: users.size,
      },
      timestamp: new Date().toISOString(),
    });

    // Fetch user info via Next API and broadcast as notification (userId + username)
    if (user.userId) {
      console.log(`[SERVER] Fetching user data for userId: ${user.userId}`);
      fetch(`${publicBaseUrl}/api/users/${user.userId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        // Note: Server-to-server requests don't include cookies by default
        // We'll rely on the fallback logic for now
      })
        .then((r) => {
          console.log(`[SERVER] API response status: ${r.status}`);
          return r.ok ? r.json() : null;
        })
        .then((json) => {
          console.log(`[SERVER] API response data:`, json);
          const u = json?.user;
          // Better fallback logic for username
          const username =
            u?.name ||
            user.userName ||
            u?.email ||
            user.userEmail ||
            `User ${user.userId.slice(0, 8)}`;
          const email = u?.email || user.userEmail || null;

          console.log(`[SERVER] Final username: ${username}`);

          // Always persist display name for later presence notifications
          user.displayName = username;
          users.set(socket.id, user);

          // Send user connected notification
          io.emit("event", {
            type: "user:connected",
            data: {
              clientId: socket.id,
              userId: u?.id || user.userId,
              username,
              email,
              totalConnections: users.size,
            },
            timestamp: new Date().toISOString(),
          });
        })
        .catch((e) => {
          console.error("[SERVER] Failed to fetch user for connection:", e);
          // Fallback: send notification with available data
          const username =
            user.userName ||
            user.userEmail ||
            `User ${user.userId.slice(0, 8)}`;
          user.displayName = username;
          users.set(socket.id, user);

          console.log(`[SERVER] Using fallback username: ${username}`);

          io.emit("event", {
            type: "user:connected",
            data: {
              clientId: socket.id,
              userId: user.userId,
              username,
              email: user.userEmail,
              totalConnections: users.size,
            },
            timestamp: new Date().toISOString(),
          });
        });
    } else {
      // Handle case where no userId is available
      const username =
        user.userName || user.userEmail || `Anonymous ${socket.id.slice(0, 8)}`;
      user.displayName = username;
      users.set(socket.id, user);

      console.log(`[SERVER] No userId, using username: ${username}`);

      io.emit("event", {
        type: "user:connected",
        data: {
          clientId: socket.id,
          userId: null,
          username,
          email: user.userEmail,
          totalConnections: users.size,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Mark as active on connect
    if (!activeSockets.has(socket.id)) {
      activeSockets.add(socket.id);
      io.emit("event", {
        type: "presence",
        data: {
          socketId: socket.id,
          state: "active",
          activeCount: activeSockets.size,
          activeIds: Array.from(activeSockets),
        },
        timestamp: new Date().toISOString(),
      });
      // Also notify SSE API about new active connection
      notifySSEPresence({
        socketId: socket.id,
        state: "active",
        activeCount: activeSockets.size,
        activeIds: Array.from(activeSockets),
      });
    }

    // Join default room
    socket.join("general");

    // Handle room joins
    socket.on("join-room", (room) => {
      socket.join(room);
      user.rooms.add(room);
      user.lastActive = new Date();

      socket.emit("room-joined", { room, timestamp: new Date() });
      console.log(`User ${socket.id} joined room: ${room}`);
    });

    // Handle room leaves
    socket.on("leave-room", (room) => {
      socket.leave(room);
      user.rooms.delete(room);
      user.lastActive = new Date();

      socket.emit("room-left", { room, timestamp: new Date() });
      console.log(`User ${socket.id} left room: ${room}`);
    });

    // Handle custom events
    socket.on("custom-event", (data) => {
      user.lastActive = new Date();
      console.log(`Custom event from ${socket.id}:`, data);

      socket.emit("custom-event-response", {
        ...data,
        timestamp: new Date(),
      });
    });

    // Handle ping/pong for connection health
    socket.on("ping", () => {
      user.lastActive = new Date();
      socket.emit("pong", { timestamp: new Date() });
    });

    // Handle disconnection
    socket.on("disconnect", (reason) => {
      console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
      // capture user info BEFORE deletion so we can include it in the notification
      const u = users.get(socket.id);
      users.delete(socket.id);

      // Notify everyone about the disconnection (normalized 'event' channel)
      io.emit("event", {
        type: "connection-update",
        data: {
          type: "disconnection",
          clientId: socket.id,
          totalConnections: users.size,
        },
        timestamp: new Date().toISOString(),
      });

      // Presence offline
      if (activeSockets.delete(socket.id)) {
        io.emit("event", {
          type: "presence",
          data: {
            socketId: socket.id,
            state: "offline",
            activeCount: activeSockets.size,
            activeIds: Array.from(activeSockets),
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Explicit user:disconnected notification with cached identity
      io.emit("event", {
        type: "user:disconnected",
        data: {
          clientId: socket.id,
          userId: u?.userId,
          username: u?.displayName || u?.userName || u?.userId || "Unknown",
          email: u?.userEmail || null,
        },
        timestamp: new Date().toISOString(),
      });
    });

    // Handle errors
    socket.on("error", (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
      users.delete(socket.id);
    });
  });

  // Heartbeat mechanism
  setInterval(() => {
    io.emit("heartbeat", { timestamp: new Date() });

    // Clean up inactive connections
    const now = new Date();
    const inactiveThreshold = 5 * 60 * 1000; // 5 minutes

    for (const [socketId, user] of users.entries()) {
      if (now.getTime() - user.lastActive.getTime() > inactiveThreshold) {
        console.log(`Removing inactive user: ${socketId}`);
        users.delete(socketId);
        io.sockets.sockets.get(socketId)?.disconnect();
      }
    }
  }, 30000); // Every 30 seconds

  // Presence monitor: evaluate active/inactive every second
  setInterval(() => {
    const now = Date.now();
    for (const [socketId, user] of users.entries()) {
      const isActive = now - user.lastActive.getTime() <= ACTIVE_WINDOW_MS;
      const wasActive = activeSockets.has(socketId);

      if (isActive && !wasActive) {
        activeSockets.add(socketId);
        io.emit("event", {
          type: "presence",
          data: {
            socketId,
            state: "active",
            activeCount: activeSockets.size,
            activeIds: Array.from(activeSockets),
          },
          timestamp: new Date().toISOString(),
        });
        // Also notify all active users about the newly active user
        const u = users.get(socketId);
        io.emit("event", {
          type: "user:active",
          data: {
            clientId: socketId,
            userId: u?.userId,
            username: u?.displayName || u?.userId || "Unknown",
          },
          timestamp: new Date().toISOString(),
        });
        // Notify SSE API when a connection becomes active again
        notifySSEPresence({
          socketId,
          state: "active",
          activeCount: activeSockets.size,
          activeIds: Array.from(activeSockets),
        });
      } else if (!isActive && wasActive) {
        activeSockets.delete(socketId);
        io.emit("event", {
          type: "presence",
          data: {
            socketId,
            state: "inactive",
            activeCount: activeSockets.size,
            activeIds: Array.from(activeSockets),
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  }, PRESENCE_TICK_MS);

  // Make Socket.IO available globally for API routes
  global.io = io;
  global.socketUsers = users;

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});

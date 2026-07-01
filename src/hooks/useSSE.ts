"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { logger } from "@/utils/logging";

// Shared Socket.IO registry to prevent duplicate connections per (url, path, auth)
type SocketEntry = {
  socket: Socket;
  refCount: number;
  heartbeat?: NodeJS.Timeout | null;
};

const socketRegistry = new Map<string, SocketEntry>();

function buildRegistryKey(
  url: string | undefined,
  path: string | undefined,
  auth: { token?: string; userId?: string; sessionId?: string } = {},
) {
  const base = url || "same-origin";
  const p = path || "/socket.io";
  const uid = auth.userId || "";
  const sid = auth.sessionId || "";
  const tok = auth.token || "";
  return `${base}|${p}|${uid}|${sid}|${tok}`;
}

export interface SSEConnectionConfig {
  url?: string; // base URL (origin). Leave undefined to use current origin
  path?: string; // socket.io path (must match server)
  auth?: {
    token?: string;
    userId?: string;
    sessionId?: string;
  };
  autoConnect?: boolean;
  reconnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
}

export interface SSEEvent {
  type: string;
  data: any;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface SSEConnectionStatus {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  reconnectAttempts: number;
}

export interface SSEConnection {
  socket: Socket | null;
  status: "connected" | "connecting" | "disconnected";
  statusInfo: SSEConnectionStatus;
  clientId: string | null;
  connectionInfo: { totalConnections: number; activeIds?: string[] };
  connect: () => void;
  disconnect: () => void;
  subscribe: (channels: string[]) => void;
  joinRoom: (roomName: string) => void;
  leaveRoom: (roomName: string) => void;
  sendMessage: (room: string, message: string, metadata?: any) => void;
  emit: (event: string, data: any) => void;
  addHandler: (type: string, handler: (data: any) => void) => void;
  removeHandler: (type: string) => void;
}

export function useSSE(config: SSEConnectionConfig = {}): SSEConnection {
  const {
    url,
    path = "/socket.io",
    auth = {},
    autoConnect = true,
    reconnect = true,
    reconnectAttempts = 5,
    reconnectDelay = 1000,
    heartbeatInterval = 30000,
  } = config;

  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectCountRef = useRef(0);
  const eventHandlersRef = useRef<Record<string, (data: any) => void>>({});
  const presenceRef = useRef<{ activeIds: Set<string> }>({
    activeIds: new Set(),
  });
  const socketListenerRef = useRef<{
    connect?: (...args: any[]) => void;
    disconnect?: (reason: string) => void;
    connect_error?: (error: Error) => void;
    connected?: (data: any) => void;
    subscribed?: (data: any) => void;
    room_joined?: (data: any) => void;
    room_left?: (data: any) => void;
    message?: (data: any) => void;
    heartbeat?: (data: any) => void;
    pong?: (data: any) => void;
    event?: (evt: any) => void;
  }>({});
  const hookIdRef = useRef<string>("");
  if (!hookIdRef.current) {
    hookIdRef.current = `hook-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  }

  const [status, setStatus] = useState<SSEConnectionStatus>({
    connected: false,
    connecting: false,
    error: null,
    reconnectAttempts: 0,
  });
  const [clientIdState, setClientIdState] = useState<string | null>(null);
  const [connectionInfo, setConnectionInfo] = useState<{
    totalConnections: number;
  }>({ totalConnections: 0 });

  // Initialize or reuse a socket connection (singleton per registry key)
  const initializeSocket = useCallback(() => {
    const key = buildRegistryKey(url, path, auth);

    // Reuse from registry
    const existing = socketRegistry.get(key);
    if (existing) {
      existing.refCount += 1;
      const socket = existing.socket;
      socketRef.current = socket;
      // Attach per-hook listeners for this instance
      // Ensure we don't attach twice for the same instance
      if (!socketListenerRef.current.connect) {
        const attach = buildPerHookListeners(socket);
        socketListenerRef.current = attach;
      }
      return socket;
    }

    // Create new socket
    const ioOptions = {
      path,
      transports: ["polling", "websocket"] as string[],
      autoConnect: false,
      reconnection: false, // We'll handle reconnection manually
      timeout: 10000,
      reconnectionDelayMax: 5000,
      auth: {
        token: auth.token,
        userId: auth.userId,
        sessionId: auth.sessionId,
      },
    };

    const socket = url ? io(url, ioOptions) : io("/", ioOptions);

    // Attach per-hook listeners for this new socket
    const attach = buildPerHookListeners(socket);
    socketListenerRef.current = attach;

    // Register in registry with refCount=1
    socketRegistry.set(key, { socket, refCount: 1, heartbeat: null });
    socketRef.current = socket;
    return socket;
  }, [url, path, auth.token, auth.userId, auth.sessionId]);

  function buildPerHookListeners(socket: Socket) {
    const onConnect = () => {
      logger.info("SSE", "SSE connected", {
        socketId: socket.id,
        hook: hookIdRef.current,
      });
      setStatus((prev) => ({
        ...prev,
        connected: true,
        connecting: false,
        error: null,
        reconnectAttempts: 0,
      }));
      setClientIdState(socket.id ?? null);
      reconnectCountRef.current = 0;
    };
    const onDisconnect = (reason: string) => {
      logger.info("SSE", "SSE disconnected", {
        reason,
        hook: hookIdRef.current,
      });
      setStatus((prev) => ({ ...prev, connected: false, connecting: false }));
      setClientIdState(null);
      if (reconnect && reason !== "io client disconnect") {
        handleReconnect();
      }
    };
    const onConnectError = (error: Error) => {
      logger.error("SSE", "SSE connection error", error);
      setStatus((prev) => ({
        ...prev,
        connecting: false,
        error: error.message,
      }));
      if (reconnect) {
        handleReconnect();
      }
    };
    const onConnectedEvent = (data: any) => {
      logger.debug("SSE", "SSE connection confirmed", data);
      if (typeof data?.totalConnections === "number") {
        setConnectionInfo({ totalConnections: data.totalConnections });
      }
    };
    const onSubscribed = (data: any) =>
      logger.debug("SSE", "SSE subscribed to channels", data);
    const onRoomJoined = (data: any) =>
      logger.debug("SSE", "SSE joined room", data);
    const onRoomLeft = (data: any) =>
      logger.debug("SSE", "SSE left room", data);
    const onMessage = (data: any) => {
      logger.debug("SSE", "SSE message received", data);
      const handler = eventHandlersRef.current["message"];
      if (handler) handler(data);
    };
    const onHeartbeat = (data: any) => {
      logger.debug("SSE", "SSE heartbeat received", data);
      if (typeof data?.totalConnections === "number") {
        setConnectionInfo({ totalConnections: data.totalConnections });
      }
    };
    const onPong = (data: any) =>
      logger.debug("SSE", "SSE pong received", data);
    const onEvent = (evt: any) => {
      const eventType = evt?.type;
      const eventData = evt?.data ?? evt;
      if (!eventType) return;
      logger.debug("SSE", `SSE generic event: ${eventType}`, eventData);
      if (
        eventType === "connection-update" &&
        typeof eventData?.totalConnections === "number"
      ) {
        setConnectionInfo({ totalConnections: eventData.totalConnections });
      }
      if (eventType === "presence") {
        // Maintain presence list for consumers
        const { socketId, state, activeIds } = eventData || {};
        if (Array.isArray(activeIds)) {
          presenceRef.current.activeIds = new Set(activeIds);
        } else if (socketId && state) {
          const set = presenceRef.current.activeIds;
          if (state === "active") set.add(socketId);
          if (state === "inactive" || state === "offline") set.delete(socketId);
        }
        const handler = eventHandlersRef.current["presence"];
        if (handler) handler(eventData);
      }
      const handler = eventHandlersRef.current[eventType];
      if (handler) handler(eventData);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("connected", onConnectedEvent);
    socket.on("subscribed", onSubscribed);
    socket.on("room-joined", onRoomJoined);
    socket.on("room-left", onRoomLeft);
    socket.on("message", onMessage);
    socket.on("heartbeat", onHeartbeat);
    socket.on("pong", onPong);
    socket.on("event", onEvent);

    return {
      connect: onConnect,
      disconnect: onDisconnect,
      connect_error: onConnectError,
      connected: onConnectedEvent,
      subscribed: onSubscribed,
      room_joined: onRoomJoined,
      room_left: onRoomLeft,
      message: onMessage,
      heartbeat: onHeartbeat,
      pong: onPong,
      event: onEvent,
    };
  }

  // Handle reconnection
  const handleReconnect = useCallback(() => {
    if (reconnectCountRef.current >= reconnectAttempts) {
      setStatus((prev) => ({
        ...prev,
        error: `Max reconnection attempts (${reconnectAttempts}) exceeded`,
      }));
      return;
    }

    reconnectCountRef.current++;
    setStatus((prev) => ({
      ...prev,
      connecting: true,
      reconnectAttempts: reconnectCountRef.current,
    }));

    logger.info("SSE", "Attempting SSE reconnection", {
      attempt: reconnectCountRef.current,
      maxAttempts: reconnectAttempts,
    });

    // Schedule reconnection attempt
    reconnectTimeoutRef.current = setTimeout(() => {
      if (!socketRef.current) initializeSocket();
      socketRef.current?.connect();
    }, reconnectDelay * reconnectCountRef.current);
  }, [reconnectAttempts, reconnectDelay, initializeSocket]);

  // Connect to SSE service
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      logger.warn("SSE", "SSE already connected");
      return;
    }

    setStatus((prev) => ({ ...prev, connecting: true }));
    const socket = initializeSocket();
    // Start per-hook heartbeat timer but emit through shared socket
    if (heartbeatInterval > 0) {
      if (heartbeatIntervalRef.current)
        clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = setInterval(() => {
        if (socket.connected) socket.emit("ping");
      }, heartbeatInterval);
    }
    socket.connect();
  }, [initializeSocket, heartbeatInterval]);

  // Disconnect from SSE service
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    if (socketRef.current) {
      const key = buildRegistryKey(url, path, auth);
      const entry = socketRegistry.get(key);
      if (entry) {
        entry.refCount -= 1;
        if (entry.refCount <= 0) {
          // Detach listeners installed by this hook
          const L = socketListenerRef.current;
          if (L.connect) socketRef.current.off("connect", L.connect);
          if (L.disconnect) socketRef.current.off("disconnect", L.disconnect);
          if (L.connect_error)
            socketRef.current.off("connect_error", L.connect_error);
          if (L.connected) socketRef.current.off("connected", L.connected);
          if (L.subscribed) socketRef.current.off("subscribed", L.subscribed);
          if (L.room_joined)
            socketRef.current.off("room-joined", L.room_joined);
          if (L.room_left) socketRef.current.off("room-left", L.room_left);
          if (L.message) socketRef.current.off("message", L.message);
          if (L.heartbeat) socketRef.current.off("heartbeat", L.heartbeat);
          if (L.pong) socketRef.current.off("pong", L.pong);
          if (L.event) socketRef.current.off("event", L.event);
          entry.socket.disconnect();
          socketRegistry.delete(key);
        }
      }
      socketRef.current = null;
    }

    setStatus({
      connected: false,
      connecting: false,
      error: null,
      reconnectAttempts: 0,
    });

    reconnectCountRef.current = 0;
    logger.info("SSE", "SSE disconnected manually");
  }, [url, path, auth.token, auth.userId, auth.sessionId]);

  // Back-compat handler registry
  const addHandler = useCallback(
    (type: string, handler: (data: any) => void) => {
      eventHandlersRef.current[type] = handler;
    },
    [],
  );

  const removeHandler = useCallback((type: string) => {
    delete eventHandlersRef.current[type];
  }, []);

  // Subscribe to channels
  const subscribe = useCallback((channels: string[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("subscribe", { channels });
    } else {
      logger.warn("SSE", "Cannot subscribe: SSE not connected");
    }
  }, []);

  // Join a room
  const joinRoom = useCallback((roomName: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("join-room", roomName);
    } else {
      logger.warn("SSE", "Cannot join room: SSE not connected");
    }
  }, []);

  // Leave a room
  const leaveRoom = useCallback((roomName: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("leave-room", roomName);
    } else {
      logger.warn("SSE", "Cannot leave room: SSE not connected");
    }
  }, []);

  // Send a message to a room
  const sendMessage = useCallback(
    (room: string, message: string, metadata?: any) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("send-message", { room, message, metadata });
      } else {
        logger.warn("SSE", "Cannot send message: SSE not connected");
      }
    },
    [],
  );

  // Emit a custom event
  const emit = useCallback((event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      logger.warn("SSE", "Cannot emit event: SSE not connected");
    }
  }, []);

  // Auto-connect on mount if enabled and cleanup on unmount
  const hasConnectedRef = useRef(false);
  useEffect(() => {
    if (autoConnect && !hasConnectedRef.current) {
      hasConnectedRef.current = true;
      connect();
    }
    return () => {
      disconnect();
      hasConnectedRef.current = false;
    };
  }, [autoConnect]);

  // Back-compat: expose status as string as before
  const statusText: "connected" | "connecting" | "disconnected" =
    status.connected
      ? "connected"
      : status.connecting
        ? "connecting"
        : "disconnected";

  return {
    socket: socketRef.current,
    status: statusText,
    statusInfo: status,
    clientId: clientIdState,
    connectionInfo: {
      ...connectionInfo,
      activeIds: Array.from(presenceRef.current.activeIds),
    },
    connect,
    disconnect,
    subscribe,
    joinRoom,
    leaveRoom,
    sendMessage,
    emit,
    addHandler,
    removeHandler,
  };
}

// Hook for listening to specific events
export function useSSEEvent(
  eventType: string,
  callback: (data: any) => void,
  dependencies: any[] = [],
) {
  const { socket } = useSSE({ autoConnect: true });

  useEffect(() => {
    if (!socket) return;

    const handleEvent = (data: any) => {
      callback(data);
    };

    socket.on(eventType, handleEvent);

    return () => {
      socket.off(eventType, handleEvent);
    };
  }, [socket, eventType, callback, ...dependencies]);
}

// Hook for listening to room messages
export function useSSERoomMessages(
  roomName: string,
  callback: (message: any) => void,
  dependencies: any[] = [],
) {
  const { socket, joinRoom, leaveRoom } = useSSE({ autoConnect: true });

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (data: any) => {
      if (data.room === roomName) {
        callback(data);
      }
    };

    socket.on("message", handleMessage);

    return () => {
      socket.off("message", handleMessage);
    };
  }, [socket, roomName, callback, ...dependencies]);

  useEffect(() => {
    if (socket?.connected) {
      joinRoom(roomName);
    }
  }, [socket, roomName, joinRoom]);

  useEffect(() => {
    return () => {
      if (socket?.connected) {
        leaveRoom(roomName);
      }
    };
  }, [socket, roomName, leaveRoom]);
}

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";

export interface SocketNotification {
  type: string;
  data: any;
  timestamp: Date;
  from?: string;
  to?: string | string[];
  room?: string;
}

export interface SocketConnection {
  socketId: string;
  timestamp: Date;
  totalConnections: number;
}

export interface SocketRoomEvent {
  room: string;
  timestamp: Date;
}

export interface SocketUserEvent {
  socketId: string;
  userId?: string;
  timestamp: Date;
  totalConnections: number;
}

export interface SocketHeartbeat {
  timestamp: Date;
}

export interface UseSocketOptions {
  autoConnect?: boolean;
  auth?: {
    userId?: string;
    token?: string;
  };
  onConnect?: (connection: SocketConnection) => void;
  onDisconnect?: (reason: string) => void;
  onNotification?: (notification: SocketNotification) => void;
  onRoomJoined?: (event: SocketRoomEvent) => void;
  onRoomLeft?: (event: SocketRoomEvent) => void;
  onUserConnected?: (event: SocketUserEvent) => void;
  onUserDisconnected?: (event: SocketUserEvent) => void;
  onHeartbeat?: (heartbeat: SocketHeartbeat) => void;
  onError?: (error: Error) => void;
}

export interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  isConnecting: boolean;
  connection: SocketConnection | null;
  connect: () => void;
  disconnect: () => void;
  joinRoom: (room: string) => void;
  leaveRoom: (room: string) => void;
  sendCustomEvent: (data: any) => void;
  sendPing: () => void;
}

export function useSocket(options: UseSocketOptions = {}): UseSocketReturn {
  const {
    autoConnect = true,
    auth,
    onConnect,
    onDisconnect,
    onNotification,
    onRoomJoined,
    onRoomLeft,
    onUserConnected,
    onUserDisconnected,
    onHeartbeat,
    onError,
  } = options;

  const { data: session } = useSession();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connection, setConnection] = useState<SocketConnection | null>(null);

  // Initialize socket connection
  const initializeSocket = useCallback(() => {
    if (socketRef.current) {
      return socketRef.current;
    }

    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000";

    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      autoConnect: false,
      auth: {
        userId: auth?.userId || session?.user?.id,
        token: auth?.token || session?.accessToken,
      },
    });

    // Connection events
    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      setIsConnected(true);
      setIsConnecting(false);
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      setIsConnected(false);
      setIsConnecting(false);
      setConnection(null);
      onDisconnect?.(reason);
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      setIsConnecting(false);
      onError?.(error);
    });

    // Custom events
    socket.on("connected", (data: SocketConnection) => {
      console.log("Socket connection confirmed:", data);
      setConnection(data);
      onConnect?.(data);
    });

    socket.on("notification", (notification: SocketNotification) => {
      console.log("Received notification:", notification);
      onNotification?.(notification);
    });

    socket.on("room-joined", (event: SocketRoomEvent) => {
      console.log("Joined room:", event);
      onRoomJoined?.(event);
    });

    socket.on("room-left", (event: SocketRoomEvent) => {
      console.log("Left room:", event);
      onRoomLeft?.(event);
    });

    socket.on("user-connected", (event: SocketUserEvent) => {
      console.log("User connected:", event);
      onUserConnected?.(event);
    });

    socket.on("user-disconnected", (event: SocketUserEvent) => {
      console.log("User disconnected:", event);
      onUserDisconnected?.(event);
    });

    socket.on("heartbeat", (heartbeat: SocketHeartbeat) => {
      console.log("Heartbeat received:", heartbeat);
      onHeartbeat?.(heartbeat);
    });

    socket.on("custom-event-response", (data: any) => {
      console.log("Custom event response:", data);
    });

    socket.on("pong", (data: any) => {
      console.log("Pong received:", data);
    });

    socketRef.current = socket;
    return socket;
  }, [
    auth?.userId,
    auth?.token,
    session?.user?.id,
    session?.accessToken,
    onConnect,
    onDisconnect,
    onNotification,
    onRoomJoined,
    onRoomLeft,
    onUserConnected,
    onUserDisconnected,
    onHeartbeat,
    onError,
  ]);

  // Connect function
  const connect = useCallback(() => {
    const socket = initializeSocket();
    if (!socket.connected) {
      setIsConnecting(true);
      socket.connect();
    }
  }, [initializeSocket]);

  // Disconnect function
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  // Join room function
  const joinRoom = useCallback((room: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("join-room", room);
    }
  }, []);

  // Leave room function
  const leaveRoom = useCallback((room: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("leave-room", room);
    }
  }, []);

  // Send custom event function
  const sendCustomEvent = useCallback((data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("custom-event", data);
    }
  }, []);

  // Send ping function
  const sendPing = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("ping");
    }
  }, []);

  // Auto-connect effect
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Reconnect when session changes
  useEffect(() => {
    if (autoConnect && session?.user?.id) {
      // Reconnect with new session data
      disconnect();
      setTimeout(() => {
        connect();
      }, 100);
    }
  }, [session?.user?.id, autoConnect, connect, disconnect]);

  return {
    socket: socketRef.current,
    isConnected,
    isConnecting,
    connection,
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    sendCustomEvent,
    sendPing,
  };
}

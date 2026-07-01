declare module "@/lib/hooks/useSSE" {
  export interface ConnectionInfo {
    totalConnections: number;
    connectedUsers: Array<{
      userId: string;
      clientId: string;
      connectedAt: string;
    }>;
  }

  export interface SSEHookReturn {
    clientId: string | null;
    status: "connecting" | "connected" | "disconnected";
    isConnected: boolean;
    connectionInfo: ConnectionInfo;
    addHandler: (type: string, handler: (data: any) => void) => void;
    removeHandler: (type: string) => void;
    reconnect: () => void;
  }
}

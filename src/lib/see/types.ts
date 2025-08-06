export interface SSEClient {
    id: string;
    userId?: string;
    sessionId: string;
    response: Response;
    controller: ReadableStreamDefaultController;
    lastPing: number;
    metadata?: Record<string, any>;
}

export interface SSEEvent {
    event?: string;
    data: any;
    id?: string;
    retry?: number;
}

export interface SSEManagerConfig {
    heartbeatInterval: number; // milliseconds
    clientTimeout: number; // milliseconds
    maxConnections: number;
}

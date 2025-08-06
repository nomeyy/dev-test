import { SSEManager } from './manager';
import { SSEEvent } from './types';

/**
 * Utility class for easy SSE operations
 */
export class SSENotifier {
    private static sseManager = SSEManager.getInstance();

    /**
     * Send notification to specific user
     */
    static async notifyUser(userId: string, event: SSEEvent): Promise<number> {
        return this.sseManager.sendToUser(userId, event);
    }

    /**
     * Send notification to specific session
     */
    static async notifySession(sessionId: string, event: SSEEvent): Promise<number> {
        return this.sseManager.sendToSession(sessionId, event);
    }

    /**
     * Broadcast notification to all users
     */
    static async broadcast(event: SSEEvent): Promise<number> {
        return this.sseManager.broadcast(event);
    }

    /**
     * Send notification to users matching criteria
     */
    static async notifyMatching(
        filter: (client: any) => boolean,
        event: SSEEvent
    ): Promise<number> {
        return this.sseManager.sendToMatching(filter, event);
    }

    /**
     * Send notification about data updates
     */
    static async notifyDataUpdate(
        userId: string,
        resourceType: string,
        resourceId: string,
        action: 'created' | 'updated' | 'deleted',
        data?: any
    ): Promise<number> {
        return this.notifyUser(userId, {
            event: 'data_update',
            data: {
                resourceType,
                resourceId,
                action,
                data,
                timestamp: new Date().toISOString()
            }
        });
    }

    /**
     * Send progress update notification
     */
    static async notifyProgress(
        userId: string,
        jobId: string,
        progress: number,
        message?: string,
        metadata?: any
    ): Promise<number> {
        return this.notifyUser(userId, {
            event: 'progress',
            data: {
                jobId,
                progress,
                message,
                metadata,
                timestamp: new Date().toISOString()
            }
        });
    }

    /**
     * Send error notification
     */
    static async notifyError(
        userId: string,
        error: string,
        context?: any
    ): Promise<number> {
        return this.notifyUser(userId, {
            event: 'error',
            data: {
                error,
                context,
                timestamp: new Date().toISOString()
            }
        });
    }

    /**
     * Send success notification
     */
    static async notifySuccess(
        userId: string,
        message: string,
        data?: any
    ): Promise<number> {
        return this.notifyUser(userId, {
            event: 'success',
            data: {
                message,
                data,
                timestamp: new Date().toISOString()
            }
        });
    }
}
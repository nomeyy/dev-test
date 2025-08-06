import { NextRequest, NextResponse } from 'next/server';
import { SSENotifier } from './utils';

export function withSSENotification<T = any>(
    handler: (
        req: NextRequest,
        notify: typeof SSENotifier,
        ...args: any[]
    ) => Promise<NextResponse<T>>
) {
    return async (req: NextRequest, ...args: any[]): Promise<NextResponse<T>> => {
        return handler(req, SSENotifier, ...args);
    };
}
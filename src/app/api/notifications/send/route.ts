import { NextRequest, NextResponse } from "next/server";
import {SSENotifier} from "@/lib/see/utils";

export async function POST(request: NextRequest) {
    try {
        const { targetType, targetId, event, data } = await request.json();

        let sentCount = 0;

        switch (targetType) {
            case 'user':
                sentCount = await SSENotifier.notifyUser(targetId, { event, data });
                break;
            case 'session':
                sentCount = await SSENotifier.notifySession(targetId, { event, data });
                break;
            case 'broadcast':
                sentCount = await SSENotifier.broadcast({ event, data });
                break;
            default:
                return NextResponse.json({ error: 'Invalid target type' }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            sentCount,
            message: `Event sent to ${sentCount} clients`
        });
    } catch (error) {
        console.error('Send notification error:', error);
        return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
    }
}
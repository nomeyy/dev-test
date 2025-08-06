import { NextResponse } from 'next/server';
import { SSEManager } from "@/lib/see/manager";


export async function GET() {
    try {
        const sseManager = SSEManager.getInstance();
        const stats = sseManager.getStats();

        return NextResponse.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error getting SSE stats:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to get SSE statistics' },
            { status: 500 }
        );
    }
}
import { NextRequest, NextResponse } from 'next/server'
import { sseManager } from '@/server/sseManager'

export async function POST(req: NextRequest) {
    const { userId, event, payload } = await req.json()

    sseManager.sendEvent(userId, event, payload)

    return NextResponse.json({ ok: true })
}

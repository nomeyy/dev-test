import { NextRequest } from 'next/server'
import { sseManager } from '@/server/sseManager'

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId') || 'anon'

    const stream = new TransformStream()
    const writer = stream.writable.getWriter()

    const encoder = new TextEncoder()
    const write = (msg: string) => writer.write(encoder.encode(msg))
    const close = () => writer.close()

    sseManager.addClient({ write, close }, userId)

    req.signal.addEventListener('abort', () => {
        sseManager.removeClient(userId)
    })

    return new Response(stream.readable, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        },
    })
}

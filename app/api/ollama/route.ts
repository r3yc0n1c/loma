import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
    const body = await req.json()

    const res = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: body.model || 'qwen2.5-coder',
            prompt: body.prompt,
            stream: true, // Enable streaming
        }),
    })

    // Stream the response back to the client
    const { readable, writable } = new TransformStream()
    res.body?.pipeTo(writable)
    return new NextResponse(readable, {
        headers: {
            'Content-Type': 'text/event-stream',
        },
    })
}

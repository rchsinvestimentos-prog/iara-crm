import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join, extname } from 'path'

const UPLOADS_DIR = process.env.UPLOADS_DIR || '/app/uploads'

const MIME: Record<string, string> = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webm': 'video/webm',
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    try {
        const { path } = await params
        const filePath = join(UPLOADS_DIR, ...path)

        // Prevent directory traversal
        if (!filePath.startsWith(UPLOADS_DIR)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        if (!existsSync(filePath)) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 })
        }

        const buffer = await readFile(filePath)
        const ext = extname(filePath).toLowerCase()
        const contentType = MIME[ext] || 'application/octet-stream'

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=3600',
            },
        })
    } catch {
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

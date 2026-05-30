import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'procedimentos'
      ORDER BY ordinal_position
    `
    return NextResponse.json({ columns })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

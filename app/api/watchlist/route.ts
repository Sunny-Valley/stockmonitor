import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// 1. 获取所有股票 (GET)
export async function GET() {
  try {
    const result = await sql`SELECT * FROM watchlist ORDER BY added_at ASC`;
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}

// 2. 添加股票 (POST)
export async function POST(request: Request) {
  try {
    const { symbol, name } = await request.json();
    if (!symbol) return NextResponse.json({ error: 'Symbol required' }, { status: 400 });

    await sql`
      INSERT INTO watchlist (symbol, name) 
      VALUES (${symbol}, ${name || 'Custom Stock'})
      ON CONFLICT (symbol) DO NOTHING;
    `;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}

// 3. 删除股票 (DELETE)
export async function DELETE(request: Request) {
  try {
    const { symbol } = await request.json();
    await sql`DELETE FROM watchlist WHERE symbol = ${symbol}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}
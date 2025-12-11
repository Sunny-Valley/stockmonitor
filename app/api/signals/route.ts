import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) return NextResponse.json({ error: 'Symbol required' }, { status: 400 });

  try {
    // 1. 获取该股票最近的 AI 信号记录 (最近 100 条)
    // 我们只需要 timestamp, action, reason, signal_score
    const result = await sql`
      SELECT timestamp, action, reason, signal_score 
      FROM ai_signals 
      WHERE symbol = ${symbol} 
      ORDER BY timestamp ASC 
      LIMIT 100;
    `;
    
    // 2. 格式化返回
    const formatted = result.rows.map(row => ({
      ...row,
      timestamp: new Date(row.timestamp).getTime() // 统一转为毫秒时间戳方便前端对比
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    // 如果表不存在 (Python还没运行过)，返回空数组而不报错
    console.error("Signal fetch error:", error);
    return NextResponse.json([]);
  }
}
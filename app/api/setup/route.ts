import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. 确保 watchlist 表存在 (之前的步骤)
    await sql`
      CREATE TABLE IF NOT EXISTS watchlist (
        symbol VARCHAR(20) PRIMARY KEY,
        name VARCHAR(100),
        added_at TIMESTAMP DEFAULT NOW()
      );
    `;

    // 2. >>> 核心修复：创建 ai_signals 表 <<<
    // 这张表用来存储 Python 后端计算出来的 AI 信号
    await sql`
      CREATE TABLE IF NOT EXISTS ai_signals (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(20) NOT NULL,
        timestamp TIMESTAMP NOT NULL,
        price DECIMAL,
        signal_score DECIMAL,
        action VARCHAR(10),
        reason TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(symbol, timestamp)
      );
    `;

    return NextResponse.json({ 
      success: true, 
      message: "数据库初始化成功！表 'watchlist' 和 'ai_signals' 已准备就绪。" 
    });
    
  } catch (error) {
    console.error("Setup failed:", error);
    return NextResponse.json({ 
      success: false, 
      error: error 
    }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. 强制创建 ai_signals 表
    // 我们甚至可以先 DROP TABLE 以防万一，但为了安全这里只用 CREATE IF NOT EXISTS
    const result = await sql`
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

    // 2. 插入一条测试数据，确保存储成功
    await sql`
      INSERT INTO ai_signals (symbol, timestamp, price, signal_score, action, reason)
      VALUES ('TEST', NOW(), 100.00, 99, 'BUY', 'Database connection test successful')
      ON CONFLICT (symbol, timestamp) DO NOTHING;
    `;

    return NextResponse.json({ 
      success: true, 
      message: "表 'ai_signals' 创建成功！测试数据已写入。" 
    });
    
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
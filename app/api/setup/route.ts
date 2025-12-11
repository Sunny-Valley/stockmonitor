import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';


CREATE TABLE IF NOT EXISTS ai_signals (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  price DECIMAL,
  signal_score DECIMAL, -- -100 (强力做空) 到 100 (强力做多)
  action VARCHAR(10),   -- 'BUY', 'SELL', 'HOLD'
  reason TEXT,          -- AI 的分析理由
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(symbol, timestamp)
);

// >>> 新增这一行，强制不缓存，每次都去数据库查 <<<
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. 创建 watchlist 表
    await sql`
      CREATE TABLE IF NOT EXISTS watchlist (
        symbol VARCHAR(20) PRIMARY KEY,
        name VARCHAR(100),
        added_at TIMESTAMP DEFAULT NOW()
      );
    `;

    // 2. 插入初始数据 (使用 ON CONFLICT DO NOTHING 防止重复报错)
    await sql`
      INSERT INTO watchlist (symbol, name) 
      VALUES 
        ('RGTI', 'Rigetti Computing'),
        ('QBTS', 'D-Wave Quantum'),
        ('IONQ', 'IonQ Inc')
      ON CONFLICT (symbol) DO NOTHING;
    `;

    return NextResponse.json({ 
      message: "数据库初始化成功！表已创建，默认数据已添加。", 
      success: true 
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: "初始化失败", 
      details: error 
    }, { status: 500 });
  }
}
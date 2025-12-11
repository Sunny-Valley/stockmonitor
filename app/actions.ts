'use server';

import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";

// 添加股票
export async function addStock(symbol: string) {
  const upperSymbol = symbol.toUpperCase().trim();
  if (!upperSymbol) return;

  try {
    // 插入初始数据，状态设为 WAIT
    await sql`
      INSERT INTO stock_analysis (symbol, price, change_percent, prediction, signal, rsi, history, updated_at)
      VALUES (${upperSymbol}, 0, 0, 0, 'WAIT', 0, '[]', NOW())
      ON CONFLICT (id) DO NOTHING; 
    `;
    revalidatePath('/'); // 刷新页面数据
  } catch (error) {
    console.error('Failed to add stock:', error);
  }
}

// --- 这就是删除功能的后端逻辑 ---
export async function deleteStock(symbol: string) {
  try {
    await sql`DELETE FROM stock_analysis WHERE symbol = ${symbol}`;
    revalidatePath('/'); // 删除后立即刷新页面
  } catch (error) {
    console.error('Failed to delete stock:', error);
  }
}
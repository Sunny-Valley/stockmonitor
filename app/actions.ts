'use server';

import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";

// 添加股票
export async function addStock(symbol: string) {
  const upperSymbol = symbol.toUpperCase().trim();
  if (!upperSymbol) return;

  try {
    // 插入一条初始记录，标记为 PENDING，等待 Python 脚本下次运行时抓取数据
    await sql`
      INSERT INTO stock_analysis (symbol, price, change_percent, prediction, signal, rsi, history, updated_at)
      VALUES (${upperSymbol}, 0, 0, 0, 'WAIT', 0, '[]', NOW())
      ON CONFLICT (id) DO NOTHING; 
    `;
    // 注意：这里我们利用了 symbol 不是主键的特性，允许插入新行。
    // 如果想要去重，最好在 Python 脚本里处理，或者前端判断。
    // 为了简单，我们这里假设用户不会重复添加已存在的。
    revalidatePath('/');
  } catch (error) {
    console.error('Failed to add stock:', error);
  }
}

// 删除股票
export async function deleteStock(symbol: string) {
  try {
    await sql`DELETE FROM stock_analysis WHERE symbol = ${symbol}`;
    revalidatePath('/');
  } catch (error) {
    console.error('Failed to delete stock:', error);
  }
}
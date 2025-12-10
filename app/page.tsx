import { sql } from "@vercel/postgres";

// 1. 定义数据的结构接口 (告诉 TypeScript 每一行数据长什么样)
interface StockRow {
  id: number;
  symbol: string;
  price: string;      // 数据库的 Decimal 类型通常会被转为字符串返回
  prediction: string;
  signal: string;
  rsi: string;
  updated_at: Date;
}

// 强制不缓存，每次刷新获取最新
export const dynamic = 'force-dynamic';

export default async function Home() {
  // 2. 这里显式告诉 TypeScript: "rows 是一个由 StockRow 组成的数组"
  let rows: StockRow[] = [];
  
  try {
    // 3. 给 SQL 查询也加上类型提示 (可选，但推荐)
    const result = await sql<StockRow>`
      SELECT DISTINCT ON (symbol) *
      FROM stock_analysis
      ORDER BY symbol, updated_at DESC;
    `;
    rows = result.rows;
  } catch (e) {
    console.log("Database not ready yet", e);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">
        美股 AI 量化看板 (15m)
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {rows.map((row) => {
          const isBuy = row.signal === 'BUY';
          const isSell = row.signal === 'SELL';
          
          return (
            <div key={row.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">{row.symbol}</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                  isBuy ? 'bg-green-900 text-green-300' : 
                  isSell ? 'bg-red-900 text-red-300' : 'bg-slate-700 text-slate-300'
                }`}>
                  {row.signal}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-slate-500 text-sm">当前价格</p>
                  <p className="text-xl font-mono">${row.price}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-sm">AI 预测</p>
                  <p className={`text-xl font-mono ${Number(row.prediction) > Number(row.price) ? 'text-green-400' : 'text-red-400'}`}>
                    ${row.prediction}
                  </p>
                </div>
              </div>
              
              <div className="text-xs text-slate-500 text-right mt-2">
                RSI: {row.rsi} | 更新于: {new Date(row.updated_at).toLocaleTimeString()}
              </div>
            </div>
          )
        })}
        
        {rows.length === 0 && (
          <div className="col-span-full text-center text-slate-500 py-20">
            等待数据分析脚本运行...<br/>(如果是盘前/盘后，脚本不会产生数据)
          </div>
        )}
      </div>
    </main>
  );
}
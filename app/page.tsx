import { sql } from "@vercel/postgres";

// 1. 定义数据的结构接口 (修复 TypeScript 报错的关键)
interface StockRow {
  id: number;
  symbol: string;
  price: string;      
  prediction: string;
  signal: string;
  rsi: string;
  updated_at: Date;
}

// 强制不缓存，每次刷新获取最新
export const dynamic = 'force-dynamic';

export default async function Home() {
  let rows: StockRow[] = [];
  
  try {
    // 获取每只股票最新的一条数据
    const result = await sql<StockRow>`
      SELECT DISTINCT ON (symbol) *
      FROM stock_analysis
      ORDER BY symbol, updated_at DESC;
    `;
    rows = result.rows;
  } catch (e) {
    console.log("Database error (likely not initialized yet):", e);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-7xl mx-auto mb-8 text-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">
          美股 AI 量化看板 (15m)
        </h1>
        <p className="text-slate-400 text-sm mt-2">
          状态: {rows.length > 0 ? "系统在线" : "等待数据初始化..."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {rows.map((row) => {
          const isBuy = row.signal === 'BUY';
          const isSell = row.signal === 'SELL';
          
          // 判断数据时效性 (如果数据超过30分钟未更新，视为休市或历史数据)
          const updateTime = new Date(row.updated_at);
          const now = new Date();
          const isStale = (now.getTime() - updateTime.getTime()) > 30 * 60 * 1000;

          return (
            <div key={row.id} className={`border rounded-xl p-6 shadow-xl relative overflow-hidden transition-all ${
              isStale ? 'bg-slate-900/50 border-slate-800 opacity-80' : 'bg-slate-900 border-slate-700'
            }`}>
              
              {/* 休市/历史数据标记 */}
              {isStale && (
                <div className="absolute top-0 right-0 bg-slate-800 text-slate-500 text-[10px] px-2 py-1 rounded-bl font-mono">
                  HISTORICAL / CLOSED
                </div>
              )}

              <div className="flex justify-between items-center mb-4">
                <h2 className={`text-2xl font-bold ${isStale ? 'text-slate-400' : 'text-white'}`}>
                  {row.symbol}
                </h2>
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                  isBuy ? 'bg-green-900 text-green-300' : 
                  isSell ? 'bg-red-900 text-red-300' : 'bg-slate-700 text-slate-300'
                }`}>
                  {row.signal}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-slate-500 text-sm">收盘价</p>
                  <p className="text-xl font-mono text-slate-200">${row.price}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-sm">AI 预测</p>
                  <p className={`text-xl font-mono ${
                    Number(row.prediction) > Number(row.price) ? 'text-green-400' : 'text-red-400'
                  }`}>
                    ${row.prediction}
                  </p>
                </div>
              </div>
              
              <div className="text-xs text-slate-500 text-right mt-2 flex justify-between border-t border-slate-800 pt-2">
                <span>RSI: {row.rsi}</span>
                <span>{updateTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
            </div>
          )
        })}
        
        {rows.length === 0 && (
          <div className="col-span-full text-center text-slate-500 py-20 border border-dashed border-slate-800 rounded-xl">
            <p className="mb-2">暂无数据</p>
            <p className="text-xs">请前往 GitHub Actions 手动触发一次 "Stock AI Bot" 以进行初始化。</p>
          </div>
        )}
      </div>
    </main>
  );
}
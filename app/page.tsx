import { sql } from "@vercel/postgres";

// 定义数据接口
interface StockRow {
  id: number;
  symbol: string;
  price: string;
  prediction: string;
  signal: string;
  rsi: string;
  updated_at: Date;
}

// 强制不缓存
export const dynamic = 'force-dynamic';

export default async function Home() {
  let rows: StockRow[] = [];
  
  try {
    const result = await sql<StockRow>`
      SELECT DISTINCT ON (symbol) *
      FROM stock_analysis
      ORDER BY symbol, updated_at DESC;
    `;
    rows = result.rows;
  } catch (e) {
    console.log("Database empty or error:", e);
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 p-8 font-sans">
      <div className="max-w-7xl mx-auto mb-10 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl mb-2">
          美股 <span className="text-blue-600">AI</span> 量化看板
        </h1>
        <p className="text-sm font-medium text-gray-500">
          系统状态: 
          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${rows.length > 0 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
            {rows.length > 0 ? "在线运行中" : "等待数据初始化"}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {rows.map((row) => {
          const isBuy = row.signal === 'BUY';
          const isSell = row.signal === 'SELL';
          
          // 时效性检查 (30分钟)
          const updateTime = new Date(row.updated_at);
          const now = new Date();
          const isStale = (now.getTime() - updateTime.getTime()) > 30 * 60 * 1000;

          return (
            <div key={row.id} className={`relative bg-white rounded-xl border p-6 transition-shadow hover:shadow-lg ${
              isStale ? 'border-gray-200 opacity-75' : 'border-gray-200 shadow-sm'
            }`}>
              
              {/* 历史数据标签 */}
              {isStale && (
                <div className="absolute top-0 right-0 bg-gray-100 text-gray-500 text-[10px] px-2 py-1 rounded-bl border-b border-l border-gray-200">
                   休市 / 历史数据
                </div>
              )}

              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 tracking-tight">
                  {row.symbol}
                </h2>
                <span className={`px-3 py-1 rounded-md text-sm font-bold border ${
                  isBuy ? 'bg-green-50 text-green-700 border-green-200' : 
                  isSell ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-600 border-gray-200'
                }`}>
                  {row.signal}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-6">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">最新收盘</p>
                  <p className="text-2xl font-mono text-gray-900 mt-1">${row.price}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">AI 预测</p>
                  <p className={`text-2xl font-mono mt-1 ${
                    Number(row.prediction) > Number(row.price) ? 'text-green-600' : 'text-red-600'
                  }`}>
                    ${row.prediction}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-4 border-t border-gray-100 text-xs text-gray-400 font-mono">
                <span>RSI: <span className={Number(row.rsi) > 70 || Number(row.rsi) < 30 ? 'text-gray-700 font-bold' : ''}>{row.rsi}</span></span>
                <span>{updateTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
            </div>
          )
        })}
        
        {/* 空状态提示 */}
        {rows.length === 0 && (
          <div className="col-span-full bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
            <div className="mx-auto h-12 w-12 text-gray-300 mb-4">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">暂无分析数据</h3>
            <p className="mt-1 text-sm text-gray-500">数据库是空的。请检查 GitHub Actions 是否已成功运行。</p>
          </div>
        )}
      </div>
    </main>
  );
}
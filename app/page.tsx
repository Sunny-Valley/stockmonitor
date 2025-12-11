import { sql } from "@vercel/postgres";
import StockPredictionChart from '@/components/StockPredictionChart';
// 假设 Dashboard 组件在同一目录下或者 components 下，这里根据您的报错日志保留原有引用方式
// 如果 Dashboard 在 components 目录，请取消下面这行的注释并删除原有的引用
// import Dashboard from '@/components/Dashboard'; 

// 这是一个服务端组件 (Server Component)
export default async function Page() {
  let rows: any[] = [];
  
  try {
    // 您的原有数据库逻辑
    const result = await sql`
      SELECT DISTINCT ON (symbol) * FROM stock_analysis 
      ORDER BY symbol, updated_at DESC;
    `;
    rows = result.rows;
  } catch (e) {
    console.error("Database Error:", e);
  }

  return (
    <main className="min-h-screen bg-gray-100 text-gray-900 font-sans pb-10">
      {/* 顶部导航栏 */}
      <nav className="bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-sm">PRO</span>
            Nano Banana - 美股 AI 量化看板
          </h1>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${rows.length > 0 ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
            <span className="text-xs font-medium text-gray-500">
              Live Data
            </span>
          </div>
        </div>
      </nav>

      <div className="max-w-[1800px] mx-auto p-6">
        {/* 1. 插入新的双曲线走势图 */}
        <div className="mb-8">
          <StockPredictionChart />
        </div>

        {/* 2. 保留原有的 Dashboard 数据表格 */}
        {/* 注意：如果您的 Dashboard 组件需要导入，请确保文件头部有正确的 import */}
        {/* 这里假设 Dashboard 组件已经在您的项目中定义好了 */}
        <Dashboard data={rows} />
      </div>
    </main>
  );
}

// 简单的 Dashboard 占位组件，防止如果找不到 Dashboard 组件报错
// 如果您已有单独的 Dashboard.tsx，请删除下面这个函数，并在顶部 import Dashboard
function Dashboard({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return <div className="text-center p-10 text-gray-500">暂无数据</div>;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.map((row: any) => (
        <div key={row.symbol} className="bg-white p-4 rounded shadow border border-gray-100">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-lg">{row.symbol}</h3>
            <span className="text-xs text-gray-400">{new Date(row.updated_at).toLocaleString()}</span>
          </div>
          <div className="text-sm">
            <p>价格: <span className="font-mono">{row.price || 'N/A'}</span></p>
            <p>预测: {row.analysis || '暂无分析'}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
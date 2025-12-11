import { sql } from "@vercel/postgres";
import Dashboard from "./components/Dashboard"; // 引入刚才写的组件

// 强制动态渲染 (不缓存)
export const dynamic = 'force-dynamic';

export default async function Page() {
  let rows: any[] = [];
  
  try {
    // 这里获取所有字段，包括新增的 change_percent 和 history
    const result = await sql`
      SELECT DISTINCT ON (symbol) *
      FROM stock_analysis
      ORDER BY symbol, updated_at DESC;
    `;
    rows = result.rows;
  } catch (e) {
    console.error("Database Error:", e);
  }

  return (
    <main className="min-h-screen bg-gray-100 text-gray-900">
      {/* 顶部导航 */}
      <nav className="bg-white border-b border-gray-200 px-8 py-4 mb-2">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
            <h1 className="text-xl font-extrabold tracking-tight text-gray-900 flex items-center gap-2">
              📊 美股 <span className="text-blue-600">AI</span> 量化看板
            </h1>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${rows.length > 0 ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span className="text-xs font-medium text-gray-500">
                {rows.length > 0 ? "系统在线" : "等待数据"}
              </span>
            </div>
        </div>
      </nav>

      {/* 加载仪表盘组件 */}
      <Dashboard data={rows} />
    </main>
  );
}
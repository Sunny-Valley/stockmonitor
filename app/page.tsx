import { sql } from "@vercel/postgres";
import Dashboard from "./components/Dashboard";

export const dynamic = 'force-dynamic';

export default async function Page() {
  let rows: any[] = [];
  
  try {
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
    <main className="min-h-screen bg-gray-100 text-gray-900 font-sans">
      <nav className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
            <h1 className="text-lg font-bold tracking-tight text-gray-900 flex items-center gap-2">
              <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-sm">PRO</span>
              美股 AI 量化看板
            </h1>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${rows.length > 0 ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
              <span className="text-xs font-medium text-gray-500">
                Live Data
              </span>
            </div>
        </div>
      </nav>

      <Dashboard data={rows} />
    </main>
  );
}
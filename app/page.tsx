import StockDashboard from '@/components/StockDashboard';

export default function Page() {
  return (
    <main className="min-h-screen bg-gray-100 text-gray-900 font-sans">
      {/* 顶部导航栏 */}
      <nav className="bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-sm">PRO</span>
            Nano Banana - 美股 AI 量化看板
          </h1>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-xs font-medium text-gray-500">
              System Online
            </span>
          </div>
        </div>
      </nav>

      {/* 核心仪表盘区域 */}
      <StockDashboard />
    </main>
  );
}
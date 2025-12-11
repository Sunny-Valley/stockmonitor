'use client';

import { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUp, ArrowDown, TrendingUp, Activity, Clock } from 'lucide-react';

interface StockData {
  id: number;
  symbol: string;
  price: string;
  change_percent: string;
  prediction: string;
  signal: string;
  rsi: string;
  history: string; // JSON string
  updated_at: Date;
}

export default function Dashboard({ data }: { data: StockData[] }) {
  // 默认选中第一个股票
  const [selectedSymbol, setSelectedSymbol] = useState<string>(data[0]?.symbol || '');
  
  // 找到当前选中的股票数据
  const selectedStock = useMemo(() => 
    data.find(item => item.symbol === selectedSymbol) || data[0], 
  [data, selectedSymbol]);

  // 解析历史数据用于画图
  const chartData = useMemo(() => {
    if (!selectedStock?.history) return [];
    try {
      return JSON.parse(selectedStock.history);
    } catch (e) {
      return [];
    }
  }, [selectedStock]);

  if (!data || data.length === 0) {
    return <div className="p-10 text-center text-gray-500">暂无数据，请检查后台更新</div>;
  }

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-100px)] gap-6 p-6 max-w-[1600px] mx-auto">
      
      {/* --- 左侧：股票列表 --- */}
      <div className="w-full md:w-1/3 lg:w-1/4 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">监控列表 ({data.length})</h2>
        </div>
        <div className="overflow-y-auto flex-1 p-2 space-y-2">
          {data.map((stock) => {
            const change = Number(stock.change_percent);
            const isUp = change >= 0;
            const isSelected = stock.symbol === selectedSymbol;

            return (
              <div 
                key={stock.id}
                onClick={() => setSelectedSymbol(stock.symbol)}
                className={`p-4 rounded-xl cursor-pointer transition-all duration-200 flex justify-between items-center group
                  ${isSelected ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200 shadow-sm' : 'hover:bg-gray-50 border border-transparent'}
                `}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-lg ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>{stock.symbol}</span>
                    {stock.signal === 'BUY' && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">BUY</span>}
                    {stock.signal === 'SELL' && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">SELL</span>}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">RSI: {stock.rsi}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-medium text-gray-900">${stock.price}</div>
                  <div className={`text-xs font-bold flex items-center justify-end gap-1 ${isUp ? 'text-green-600' : 'text-red-600'}`}>
                    {isUp ? <ArrowUp size={12}/> : <ArrowDown size={12}/>}
                    {change}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- 右侧：详情与图表 --- */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col">
        {selectedStock && (
          <>
            {/* 顶部头部信息 */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                  {selectedStock.symbol}
                  <span className={`text-lg px-3 py-1 rounded-lg font-bold border 
                    ${selectedStock.signal === 'BUY' ? 'bg-green-50 text-green-600 border-green-200' : 
                      selectedStock.signal === 'SELL' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                    {selectedStock.signal} 建议
                  </span>
                </h1>
                <p className="text-gray-500 mt-2 flex items-center gap-2 text-sm">
                  <Clock size={14}/> 更新时间: {new Date(selectedStock.updated_at).toLocaleString()}
                </p>
              </div>
              
              <div className="text-right">
                <div className="text-sm text-gray-400 mb-1">AI 预测价格</div>
                <div className={`text-3xl font-mono font-bold ${Number(selectedStock.prediction) > Number(selectedStock.price) ? 'text-green-600' : 'text-red-600'}`}>
                  ${selectedStock.prediction}
                </div>
              </div>
            </div>

            {/* 主要指标卡片 */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="text-xs text-gray-400 mb-1">当前价格</div>
                <div className="text-2xl font-bold text-gray-800">${selectedStock.price}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="text-xs text-gray-400 mb-1">今日涨跌</div>
                <div className={`text-2xl font-bold flex items-center gap-1 ${Number(selectedStock.change_percent) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                   {Number(selectedStock.change_percent)}%
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="text-xs text-gray-400 mb-1">RSI 强度</div>
                <div className="text-2xl font-bold text-blue-600">{selectedStock.rsi}</div>
              </div>
            </div>

            {/* 图表区域 */}
            <div className="flex-1 min-h-[300px] w-full relative">
               <h3 className="text-sm font-bold text-gray-500 mb-4 flex items-center gap-2">
                 <Activity size={16}/> 过去7天走势
               </h3>
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={chartData}>
                   <defs>
                     <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                       <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                     </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                   <XAxis 
                     dataKey="date" 
                     axisLine={false} 
                     tickLine={false} 
                     tick={{fill: '#9ca3af', fontSize: 12}} 
                     dy={10}
                   />
                   <YAxis 
                     domain={['auto', 'auto']} 
                     axisLine={false} 
                     tickLine={false} 
                     tick={{fill: '#9ca3af', fontSize: 12}}
                     tickFormatter={(number) => `$${number}`}
                   />
                   <Tooltip 
                     contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                   />
                   <Area 
                     type="monotone" 
                     dataKey="price" 
                     stroke="#2563eb" 
                     strokeWidth={3}
                     fillOpacity={1} 
                     fill="url(#colorPrice)" 
                   />
                 </AreaChart>
               </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
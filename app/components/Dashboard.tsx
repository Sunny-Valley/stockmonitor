'use client';

import { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label } from 'recharts';
import { ArrowUp, ArrowDown, Trash2, Plus, Search, Zap, Activity } from 'lucide-react';
import { addStock, deleteStock } from '../actions';

interface StockData {
  id: number;
  symbol: string;
  price: string;
  change_percent: string;
  prediction: string;
  signal: string;
  rsi: string;
  history: string;
  updated_at: Date;
}

export default function Dashboard({ data }: { data: StockData[] }) {
  const [selectedSymbol, setSelectedSymbol] = useState<string>(data[0]?.symbol || '');
  const [newSymbol, setNewSymbol] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const safeData = data || [];

  const selectedStock = useMemo(() => 
    safeData.find(item => item.symbol === selectedSymbol) || safeData[0], 
  [safeData, selectedSymbol]);

  const { chartData, maxPrice, minPrice } = useMemo(() => {
    if (!selectedStock?.history) return { chartData: [], maxPrice: 0, minPrice: 0 };
    try {
      const history = JSON.parse(selectedStock.history);
      if (!Array.isArray(history) || history.length === 0) return { chartData: [], maxPrice: 0, minPrice: 0 };
      
      const prices = history.map((h: any) => h.price);
      return {
        chartData: history,
        maxPrice: Math.max(...prices),
        minPrice: Math.min(...prices)
      };
    } catch (e) {
      return { chartData: [], maxPrice: 0, minPrice: 0 };
    }
  }, [selectedStock]);

  const handleAddStock = async () => {
    if (!newSymbol) return;
    setIsAdding(true);
    await addStock(newSymbol);
    setNewSymbol('');
    setIsAdding(false);
  };

  const handleDeleteStock = async (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation();
    if (confirm(`确定要删除 ${symbol} 吗?`)) {
      await deleteStock(symbol);
      if (selectedSymbol === symbol) setSelectedSymbol(safeData.length > 1 ? safeData[0].symbol : '');
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-80px)] bg-gray-50/50 p-4 gap-4 max-w-[1800px] mx-auto font-sans">
      
      {/* --- 左侧：股票列表 --- */}
      <div className="w-full md:w-64 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-3 border-b border-gray-100 bg-gray-50/80 backdrop-blur flex justify-between items-center">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Stock Pool</span>
          <span className="text-xs bg-gray-200 text-gray-600 px-1.5 rounded-md">{safeData.length}</span>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {safeData.map((stock) => {
            const change = Number(stock.change_percent);
            const isUp = change >= 0;
            const isSelected = stock.symbol === selectedSymbol;

            return (
              <div 
                key={stock.id}
                onClick={() => setSelectedSymbol(stock.symbol)}
                className={`group relative flex items-center justify-between px-4 py-3 border-b border-gray-50 cursor-pointer transition-all hover:bg-gray-50
                  ${isSelected ? 'bg-blue-50/60 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}
                `}
              >
                <div className="flex flex-col">
                  <span className={`font-bold text-sm ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                    {stock.symbol}
                  </span>
                  <span className={`text-[10px] flex items-center ${isUp ? 'text-green-600' : 'text-red-500'}`}>
                    {isUp ? '+' : ''}{change}%
                  </span>
                </div>

                <div className="text-right">
                  <div className="text-sm font-mono font-medium text-gray-900">${stock.price}</div>
                </div>

                {/* --- 这里的样式实现了：绝对定位 + 悬浮显示 --- */}
                <button 
                  onClick={(e) => handleDeleteStock(e, stock.symbol)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md 
                             opacity-0 group-hover:opacity-100 transition-all duration-200 bg-white/90 shadow-sm border border-gray-100"
                  title="Remove"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="p-3 border-t border-gray-100 bg-white">
          <div className="flex gap-2">
            <input 
              type="text" 
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
              placeholder="Add Symbol..." 
              className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:border-blue-400 uppercase"
              onKeyDown={(e) => e.key === 'Enter' && handleAddStock()}
            />
            <button 
              onClick={handleAddStock}
              disabled={isAdding}
              className="bg-blue-600 text-white p-1.5 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isAdding ? <Activity size={14} className="animate-spin"/> : <Plus size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* --- 右侧：图表 (保持不变) --- */}
      <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
        {selectedStock ? (
          <>
            <div className={`absolute top-0 left-0 right-0 h-32 opacity-10 pointer-events-none 
              ${Number(selectedStock.change_percent) >= 0 ? 'bg-gradient-to-b from-green-500 to-transparent' : 'bg-gradient-to-b from-red-500 to-transparent'}`} 
            />

            <div className="relative p-6 md:p-8 flex justify-between items-end z-10">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">{selectedStock.symbol}</h1>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold border 
                    ${selectedStock.signal === 'BUY' ? 'bg-green-100 text-green-700 border-green-200' : 
                      selectedStock.signal === 'SELL' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-gray-100 text-gray-500'}`}>
                    {selectedStock.signal}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1"><Search size={14}/> Price: ${selectedStock.price}</span>
                  <span className="flex items-center gap-1"><Zap size={14}/> RSI: {selectedStock.rsi}</span>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">AI Prediction</div>
                <div className={`text-3xl font-mono font-bold ${Number(selectedStock.prediction) > Number(selectedStock.price) ? 'text-green-600' : 'text-red-500'}`}>
                  ${selectedStock.prediction}
                </div>
              </div>
            </div>

            <div className="flex-1 p-4 md:p-8 min-h-[400px]">
              <div className="w-full h-full bg-gray-50/50 rounded-2xl border border-gray-100 p-4 relative">
                 <h3 className="absolute top-4 left-4 text-xs font-bold text-gray-400 flex items-center gap-2">
                   <Activity size={14}/> WEEKLY TREND
                 </h3>
                 
                 <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                     <defs>
                       <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                         <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                       </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                     <XAxis 
                       dataKey="date" 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{fill: '#9ca3af', fontSize: 11}} 
                       dy={10}
                     />
                     <YAxis 
                       domain={['dataMin - 1', 'dataMax + 1']} 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{fill: '#9ca3af', fontSize: 11}}
                       tickFormatter={(num) => `$${num}`}
                     />
                     <Tooltip 
                       contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                       itemStyle={{color: '#1f2937', fontWeight: 'bold'}}
                     />
                     
                     <ReferenceLine y={maxPrice} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.5}>
                        <Label value={`High: $${maxPrice}`} position="insideTopRight" fill="#ef4444" fontSize={10} />
                     </ReferenceLine>
                     
                     <ReferenceLine y={minPrice} stroke="#10b981" strokeDasharray="3 3" strokeOpacity={0.5}>
                        <Label value={`Low: $${minPrice}`} position="insideBottomRight" fill="#10b981" fontSize={10} />
                     </ReferenceLine>

                     <Area 
                       type="monotone" 
                       dataKey="price" 
                       stroke="#3b82f6" 
                       strokeWidth={3}
                       fillOpacity={1} 
                       fill="url(#colorPrice)" 
                       animationDuration={1000}
                     />
                   </AreaChart>
                 </ResponsiveContainer>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-300">
            <div className="text-center">
              <Activity size={48} className="mx-auto mb-4 opacity-50"/>
              <p>Select a stock to view analysis</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
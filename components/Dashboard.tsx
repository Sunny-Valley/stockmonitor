'use client';

import { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label } from 'recharts';
import { Trash2, Plus, Search, Zap, Activity, Info, ArrowUp, ArrowDown } from 'lucide-react';
import { addStock, deleteStock } from '../app/actions';

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

const renderCustomLabel = (props: any) => {
  const { x, y, value, index, dataLength } = props;
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={-12} dy={0} textAnchor="middle" fill="#1f2937" fontSize={11} fontWeight="700" stroke="white" strokeWidth="2px" paintOrder="stroke">
        ${value}
      </text>
    </g>
  );
};

const getPredictionReasoning = (stock: StockData) => {
  const rsi = Number(stock.rsi);
  const signal = stock.signal;
  const currentPrice = Number(stock.price);
  const targetPrice = Number(stock.prediction);
  const reasons = [];

  if (signal === 'BUY') {
    reasons.push(`AI 模型识别到潜在的买入机会，预计短期内目标价为 $${targetPrice}。`);
    if (rsi < 30) {
      reasons.push(`RSI 指标为 ${rsi}，处于超卖区域，暗示股价可能会出现技术性反弹。`);
    } else {
      reasons.push(`RSI 指标为 ${rsi}，显示出上升动能，配合趋势模型判断为看涨。`);
    }
    const upside = (((targetPrice - currentPrice) / currentPrice) * 100).toFixed(1);
    reasons.push(`基于当前模型，预期潜在上涨空间约为 ${upside}%。`);

  } else if (signal === 'SELL') {
    reasons.push(`AI 模型发出风险预警，建议考虑卖出或减仓，短期目标支撑位在 $${targetPrice} 附近。`);
    if (rsi > 70) {
      reasons.push(`RSI 指标高达 ${rsi}，已进入超买区域，面临较大的回调压力。`);
    } else {
      reasons.push(`RSI 指标为 ${rsi}，显示上升动能减弱，趋势模型判断可能会出现调整。`);
    }
    const downside = (((currentPrice - targetPrice) / currentPrice) * 100).toFixed(1);
    reasons.push(`基于当前模型，预期潜在回调风险约为 ${downside}%。`);

  } else {
    reasons.push(`AI 模型建议暂时观望 (HOLD)，当前市场趋势尚不明朗。`);
    reasons.push(`RSI 指标为 ${rsi}，处于中性区域，缺乏明确的方向性信号。`);
    reasons.push(`建议等待更明确的价格突破或指标信号后再做决策，当前预测价维持在 $${targetPrice} 附近。`);
  }
  return reasons;
};


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
      <div className="w-full md:w-64 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-shrink-0">
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

                <button 
                  onClick={(e) => handleDeleteStock(e, stock.symbol)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md 
                             opacity-0 group-hover:opacity-100 transition-all duration-200 bg-white/90 shadow-sm border border-gray-100 z-10"
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

      {/* --- 右侧：详情看板 --- */}
      <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
        {selectedStock ? (
          <>
            {/* 背景装饰 */}
            <div className={`absolute top-0 left-0 right-0 h-32 opacity-10 pointer-events-none 
              ${Number(selectedStock.change_percent) >= 0 ? 'bg-gradient-to-b from-green-500 to-transparent' : 'bg-gradient-to-b from-red-500 to-transparent'}`} 
            />

            {/* 1. 顶部 Header */}
            <div className="relative p-6 flex justify-between items-start z-10 border-b border-gray-50">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">{selectedStock.symbol}</h1>
                  <span className={`px-3 py-1 rounded-md text-sm font-bold border flex items-center gap-1
                    ${selectedStock.signal === 'BUY' ? 'bg-green-100 text-green-700 border-green-200' : 
                      selectedStock.signal === 'SELL' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                    {selectedStock.signal === 'BUY' ? <ArrowUp size={14}/> : selectedStock.signal === 'SELL' ? <ArrowDown size={14}/> : <Activity size={14}/>}
                    {selectedStock.signal}
                  </span>
                </div>
                <div className="flex items-center gap-6 text-sm text-gray-500 font-medium">
                  <span className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded"><Search size={14} className="text-gray-400"/> Current: <span className="text-gray-900">${selectedStock.price}</span></span>
                  <span className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded"><Zap size={14} className="text-blue-500"/> RSI: <span className={Number(selectedStock.rsi) > 70 || Number(selectedStock.rsi) < 30 ? 'text-blue-600 font-bold' : 'text-gray-900'}>{selectedStock.rsi}</span></span>
                </div>
              </div>
              
              <div className="text-right bg-white/50 p-3 rounded-lg border border-gray-100 shadow-sm backdrop-blur-sm">
                <div className="text-xs text-gray-400 uppercase tracking-widest mb-1 font-bold flex items-center justify-end gap-1">
                  AI Target <Info size={12}/>
                </div>
                <div className={`text-3xl font-mono font-extrabold ${Number(selectedStock.prediction) > Number(selectedStock.price) ? 'text-green-600' : 'text-red-500'}`}>
                  ${selectedStock.prediction}
                </div>
              </div>
            </div>

            {/* 2. 曲线图区域 */}
            <div className="flex-1 p-4 min-h-[350px] relative z-0">
              <div className="w-full h-full bg-gradient-to-b from-white to-gray-50/50 rounded-xl border border-gray-100/50 p-2 pb-0 relative overflow-hidden">
                 <h3 className="absolute top-4 left-6 text-xs font-bold text-gray-400 flex items-center gap-2 z-10">
                   <Activity size={14} className="text-blue-500"/> 7-DAY PRICE TREND
                 </h3>
                 
                 <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={chartData} margin={{ top: 40, right: 20, left: 10, bottom: 5 }}>
                     <defs>
                       <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                         <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                       </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                     <XAxis 
                       dataKey="date" 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{fill: '#9ca3af', fontSize: 11, fontWeight: 500}} 
                       dy={10}
                       padding={{ left: 20, right: 20 }}
                     />
                     {/* --- 修正点：去掉了 .toFixed(2)，让它返回数字 --- */}
                     <YAxis 
                       domain={[dataMin => (dataMin * 0.998), dataMax => (dataMax * 1.002)]} 
                       hide={true} 
                     />
                     <Tooltip 
                       contentStyle={{backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'}}
                       itemStyle={{color: '#1f2937', fontWeight: 'bold', fontFamily: 'monospace'}}
                       formatter={(value) => [`$${value}`, 'Price']}
                       cursor={{stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '3 3'}}
                     />
                     
                     <ReferenceLine y={maxPrice} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.4}>
                        <Label value={`High: $${maxPrice}`} position="insideTopRight" fill="#ef4444" fontSize={10} fontWeight="bold" offset={10}/>
                     </ReferenceLine>
                     
                     <ReferenceLine y={minPrice} stroke="#10b981" strokeDasharray="3 3" strokeOpacity={0.4}>
                        <Label value={`Low: $${minPrice}`} position="insideBottomRight" fill="#10b981" fontSize={10} fontWeight="bold" offset={10}/>
                     </ReferenceLine>

                     <Area 
                       type="monotone" 
                       dataKey="price" 
                       stroke="#3b82f6" 
                       strokeWidth={2.5}
                       fillOpacity={1} 
                       fill="url(#colorPrice)" 
                       animationDuration={1000}
                       dot={{ r: 4, strokeWidth: 2, fill: '#ffffff', stroke: '#3b82f6', strokeOpacity: 1 }}
                       activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6' }}
                       label={renderCustomLabel}
                     />
                   </AreaChart>
                 </ResponsiveContainer>
              </div>
            </div>

            {/* 3. 底部预测解释说明 */}
            <div className="p-6 bg-gray-50/50 border-t border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Zap size={16} className="text-yellow-500 fill-yellow-500"/>
                AI Analysis Summary & Reasoning
              </h3>
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <ul className="space-y-3">
                  {getPredictionReasoning(selectedStock).map((reason, index) => (
                    <li key={index} className="text-sm text-gray-700 flex items-start gap-3 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-[0.45rem] shrink-0 shadow-sm shadow-blue-200"></span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 bg-gray-50/50">
            <div className="text-center p-8 rounded-2xl border border-gray-100 bg-white shadow-sm">
              <Activity size={40} className="mx-auto mb-4 text-blue-100"/>
              <p className="font-medium">Select a stock from the pool to view analysis.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
"use client";

import React, { useState } from 'react';
import StockPredictionChart from './StockPredictionChart';

// 定义股票类型
interface Stock {
  symbol: string;
  name: string;
}

export default function StockDashboard() {
  // 1. 股票池状态管理
  const [stocks, setStocks] = useState<Stock[]>([
    { symbol: 'RGTI', name: 'Rigetti Computing' },
    { symbol: 'QBTS', name: 'D-Wave Quantum' },
    { symbol: 'TSLA', name: 'Tesla Inc' }
  ]);
  
  // 2. 当前选中的股票
  const [selectedSymbol, setSelectedSymbol] = useState<string>('RGTI');
  
  // 3. 输入框状态
  const [newSymbol, setNewSymbol] = useState('');

  // 添加股票逻辑
  const handleAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim()) return;
    const symbolUpper = newSymbol.toUpperCase();
    if (stocks.find(s => s.symbol === symbolUpper)) {
      alert('该股票已存在');
      return;
    }
    setStocks([...stocks, { symbol: symbolUpper, name: 'Custom Stock' }]);
    setNewSymbol('');
    setSelectedSymbol(symbolUpper); // 添加后自动选中
  };

  // 删除股票逻辑
  const handleDeleteStock = (symbolToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 防止触发点击选中事件
    const updatedStocks = stocks.filter(s => s.symbol !== symbolToDelete);
    setStocks(updatedStocks);
    // 如果删除的是当前选中的，默认选中列表第一个
    if (selectedSymbol === symbolToDelete && updatedStocks.length > 0) {
      setSelectedSymbol(updatedStocks[0].symbol);
    }
  };

  return (
    <div className="flex h-[calc(100vh-80px)] gap-6 p-6 max-w-[1800px] mx-auto">
      
      {/* --- 左侧栏：股票池 (25% 宽度) --- */}
      <div className="w-1/4 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-bold text-gray-700 mb-3">我的监控池</h3>
          
          {/* 添加表单 */}
          <form onSubmit={handleAddStock} className="flex gap-2">
            <input
              type="text"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
              placeholder="输入代码 (如 NVDA)"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500 uppercase"
            />
            <button 
              type="submit"
              className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
            >
              +
            </button>
          </form>
        </div>

        {/* 股票列表 */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {stocks.length === 0 && (
            <p className="text-center text-gray-400 text-sm mt-10">暂无股票，请添加</p>
          )}
          
          {stocks.map((stock) => (
            <div
              key={stock.symbol}
              onClick={() => setSelectedSymbol(stock.symbol)}
              className={`
                group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all
                ${selectedSymbol === stock.symbol 
                  ? 'bg-blue-50 border-blue-200 border shadow-sm' 
                  : 'hover:bg-gray-50 border border-transparent'}
              `}
            >
              <div>
                <div className={`font-bold ${selectedSymbol === stock.symbol ? 'text-blue-700' : 'text-gray-800'}`}>
                  {stock.symbol}
                </div>
                <div className="text-xs text-gray-400 truncate max-w-[120px]">
                  {stock.name}
                </div>
              </div>
              
              <button
                onClick={(e) => handleDeleteStock(stock.symbol, e)}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                title="删除"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* --- 右侧栏：走势图 (75% 宽度) --- */}
      <div className="w-3/4 h-full">
        {stocks.length > 0 ? (
          <StockPredictionChart currentSymbol={selectedSymbol} />
        ) : (
          <div className="h-full flex items-center justify-center bg-white rounded-xl border border-dashed border-gray-300 text-gray-400">
            请在左侧添加股票以查看分析
          </div>
        )}
      </div>

    </div>
  );
}
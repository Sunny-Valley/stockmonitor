"use client";

import React, { useState, useEffect } from 'react';
import StockPredictionChart from './StockPredictionChart';

interface Stock {
  symbol: string;
  name: string;
}

export default function StockDashboard() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [newSymbol, setNewSymbol] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // --- 1. 加载：从数据库获取列表 ---
  useEffect(() => {
    fetchStocks();
  }, []);

  const fetchStocks = async () => {
    try {
      const res = await fetch('/api/watchlist');
      const data = await res.json();
      setStocks(data);
      if (data.length > 0 && !selectedSymbol) {
        setSelectedSymbol(data[0].symbol);
      }
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to fetch stocks", error);
      setIsLoading(false);
    }
  };

  // --- 2. 新增：写入数据库 ---
  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim()) return;
    const symbolUpper = newSymbol.toUpperCase();

    // 乐观更新 (先改界面，再请求) 防止卡顿
    const tempStock = { symbol: symbolUpper, name: 'Loading...' };
    const oldStocks = [...stocks];
    setStocks([...stocks, tempStock]);
    setNewSymbol('');

    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: symbolUpper, name: 'Custom Stock' }),
      });

      if (res.ok) {
        // 成功后重新拉取最新数据（确保 ID 和名称正确）
        await fetchStocks();
        setSelectedSymbol(symbolUpper);
      } else {
        throw new Error('Save failed');
      }
    } catch (error) {
      alert('添加失败，请重试');
      setStocks(oldStocks); // 回滚
    }
  };

  // --- 3. 删除：从数据库移除 ---
  const handleDeleteStock = async (symbolToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`确定要删除 ${symbolToDelete} 吗？`)) return;

    // 乐观更新
    const oldStocks = [...stocks];
    const updatedStocks = stocks.filter(s => s.symbol !== symbolToDelete);
    setStocks(updatedStocks);

    if (selectedSymbol === symbolToDelete) {
      setSelectedSymbol(updatedStocks.length > 0 ? updatedStocks[0].symbol : '');
    }

    try {
      await fetch('/api/watchlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: symbolToDelete }),
      });
    } catch (error) {
      alert('删除失败');
      setStocks(oldStocks); // 回滚
    }
  };

  if (isLoading) {
    return <div className="p-10 text-center text-gray-500">正在同步云端数据...</div>;
  }

  return (
    <div className="flex h-[calc(100vh-80px)] gap-6 p-6 max-w-[1800px] mx-auto">
      
      {/* 左侧栏：股票池 */}
      <div className="w-1/4 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-bold text-gray-700 mb-3 flex justify-between items-center">
            云端监控池
            <span className="text-xs font-normal text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">{stocks.length}</span>
          </h3>
          
          <form onSubmit={handleAddStock} className="flex gap-2">
            <input
              type="text"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
              placeholder="输入代码 (如 NVDA)"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500 uppercase"
            />
            <button type="submit" className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition font-bold">+</button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {stocks.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm">
              <p>暂无股票</p>
            </div>
          )}
          
          {stocks.map((stock) => (
            <div
              key={stock.symbol}
              onClick={() => setSelectedSymbol(stock.symbol)}
              className={`
                group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all border
                ${selectedSymbol === stock.symbol ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-transparent hover:bg-gray-50'}
              `}
            >
              <div>
                <div className={`font-bold flex items-center gap-2 ${selectedSymbol === stock.symbol ? 'text-blue-700' : 'text-gray-800'}`}>
                  {stock.symbol}
                </div>
                <div className="text-xs text-gray-400 truncate max-w-[120px]">{stock.name}</div>
              </div>
              
              <button
                onClick={(e) => handleDeleteStock(stock.symbol, e)}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 右侧栏：走势图 */}
      <div className="w-3/4 h-full">
        {selectedSymbol ? (
          <StockPredictionChart currentSymbol={selectedSymbol} />
        ) : (
          <div className="h-full flex items-center justify-center bg-white rounded-xl border border-dashed border-gray-300 text-gray-400">
            请选择股票
          </div>
        )}
      </div>
    </div>
  );
}
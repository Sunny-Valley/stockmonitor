"use client";

import React, { useState, useEffect } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { subBusinessDays, format, addMinutes, setHours, setMinutes } from 'date-fns';

interface ChartData {
  timestamp: string;
  displayTime: string;
  price: number;
  signal: number;
}

// 接收 currentSymbol 参数，以便切换股票时重置图表
const StockPredictionChart = ({ currentSymbol }: { currentSymbol: string }) => {
  const [data, setData] = useState<ChartData[]>([]);

  useEffect(() => {
    const generateBacktestedData = () => {
      const result: ChartData[] = [];
      const now = new Date();
      
      // 模拟不同股票有不同的初始价格
      let currentPrice = currentSymbol === 'RGTI' ? 1.5 : (currentSymbol === 'QBTS' ? 2.3 : 150.00); 
      
      // >>> 修改点：只循环最近 3 个交易日 <<<
      for (let i = 3; i > 0; i--) {
        const dateBase = subBusinessDays(now, i);
        let timeCursor = setMinutes(setHours(dateBase, 9), 30);
        const endTime = setMinutes(setHours(dateBase, 16), 0);

        while (timeCursor <= endTime) {
          const change = (Math.random() - 0.5) * (currentPrice * 0.02); // 波动幅度
          currentPrice += change;

          const mockMA = currentPrice + (Math.random() - 0.5) * (currentPrice * 0.05); 
          const backtestSignal = (mockMA - currentPrice) * 10;      

          result.push({
            timestamp: timeCursor.toISOString(),
            displayTime: format(timeCursor, 'MM-dd HH:mm'),
            price: Number(currentPrice.toFixed(2)),
            signal: Number(backtestSignal.toFixed(2))
          });

          timeCursor = addMinutes(timeCursor, 20);
        }
      }
      return result;
    };

    setData(generateBacktestedData());
  }, [currentSymbol]); // 当 symbol 变化时重新生成数据

  return (
    <div className="w-full h-full p-4 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            {currentSymbol} <span className="text-sm font-normal text-gray-500">走势预测回测</span>
          </h2>
          <p className="text-xs text-gray-500">最近 3 个交易日 (20分钟/点)</p>
        </div>
      </div>
      
      <div className="flex-1 min-h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 5, right: 0, bottom: 5, left: 0 }}>
            <CartesianGrid stroke="#f5f5f5" strokeDasharray="3 3" />
            <XAxis 
              dataKey="displayTime" 
              tick={{ fontSize: 10, fill: '#666' }}
              minTickGap={40}
            />
            <YAxis 
              yAxisId="left" 
              orientation="left"
              domain={['auto', 'auto']} 
              tick={{ fontSize: 10, fill: '#2563eb' }}
              width={40}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              domain={['auto', 'auto']} 
              tick={{ fontSize: 10, fill: '#059669' }}
              width={40}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
            />
            <Legend verticalAlign="top" height={36}/>
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="price"
              name="股价"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="signal"
              name="预测信号"
              stroke="#059669"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StockPredictionChart;
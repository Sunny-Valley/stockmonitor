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

// 定义数据类型
interface ChartData {
  timestamp: string;
  displayTime: string;
  price: number;
  signal: number;
}

const StockPredictionChart = () => {
  const [data, setData] = useState<ChartData[]>([]);

  useEffect(() => {
    const generateBacktestedData = () => {
      const result: ChartData[] = [];
      const now = new Date();
      
      let currentPrice = 150.00; 
      
      // 生成过去5天数据
      for (let i = 5; i > 0; i--) {
        const dateBase = subBusinessDays(now, i);
        let timeCursor = setMinutes(setHours(dateBase, 9), 30);
        const endTime = setMinutes(setHours(dateBase, 16), 0);

        while (timeCursor <= endTime) {
          // 模拟波动
          const change = (Math.random() - 0.5) * 1.5;
          currentPrice += change;

          // 模拟信号
          const mockMA = currentPrice + (Math.random() - 0.5) * 3; 
          const backtestSignal = (mockMA - currentPrice) * 5;      

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
  }, []);

  return (
    <div className="w-full h-[400px] p-4 bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
      <div className="mb-2 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-800">趋势预测与回测</h2>
          <p className="text-xs text-gray-500">过去5个交易日 (20分钟/点)</p>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height="85%">
        <ComposedChart data={data} margin={{ top: 5, right: 0, bottom: 5, left: 0 }}>
          <CartesianGrid stroke="#f5f5f5" strokeDasharray="3 3" />
          <XAxis 
            dataKey="displayTime" 
            tick={{ fontSize: 10, fill: '#666' }}
            minTickGap={30}
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
          <Legend verticalAlign="top" height={36} iconSize={10} wrapperStyle={{ fontSize: '12px' }}/>
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="price"
            name="实际股价"
            stroke="#2563eb"
            strokeWidth={1.5}
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
  );
};

export default StockPredictionChart;
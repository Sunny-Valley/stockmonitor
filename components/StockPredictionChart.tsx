"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Label
} from 'recharts';
import { subBusinessDays, format, addMinutes, setHours, setMinutes } from 'date-fns';

interface ChartData {
  timestamp: string;
  displayTime: string;
  price: number;
  signal: number;
}

const StockPredictionChart = ({ currentSymbol }: { currentSymbol: string }) => {
  const [data, setData] = useState<ChartData[]>([]);

  // 1. 生成数据的逻辑 (保持不变，3天周期)
  useEffect(() => {
    const generateBacktestedData = () => {
      const result: ChartData[] = [];
      const now = new Date();
      
      let currentPrice = currentSymbol === 'RGTI' ? 1.5 : (currentSymbol === 'QBTS' ? 2.3 : 150.00); 
      
      for (let i = 3; i > 0; i--) {
        const dateBase = subBusinessDays(now, i);
        let timeCursor = setMinutes(setHours(dateBase, 9), 30);
        const endTime = setMinutes(setHours(dateBase, 16), 0);

        while (timeCursor <= endTime) {
          const change = (Math.random() - 0.5) * (currentPrice * 0.02);
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
  }, [currentSymbol]);

  // 2. 计算最高价和最低价 (用于绘制标尺线)
  const { maxPrice, minPrice } = useMemo(() => {
    if (data.length === 0) return { maxPrice: 0, minPrice: 0 };
    const prices = data.map(d => d.price);
    return {
      maxPrice: Math.max(...prices),
      minPrice: Math.min(...prices)
    };
  }, [data]);

  return (
    <div className="w-full h-full p-4 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            {currentSymbol} <span className="text-sm font-normal text-gray-500">走势预测回测</span>
          </h2>
          <div className="flex gap-4 text-xs mt-1">
            <span className="text-gray-500">周期: 最近3天</span>
            <span className="text-red-500 font-medium">最高: {maxPrice}</span>
            <span className="text-green-600 font-medium">最低: {minPrice}</span>
          </div>
        </div>
      </div>
      
      <div className="flex-1 min-h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 20, right: 0, bottom: 5, left: 0 }}>
            {/* 网格线 */}
            <CartesianGrid stroke="#f5f5f5" strokeDasharray="3 3" />
            
            <XAxis 
              dataKey="displayTime" 
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              minTickGap={40}
            />
            
            {/* 左轴：股价 (根据最高最低价自动调整范围，稍微留出一点上下余量) */}
            <YAxis 
              yAxisId="left" 
              orientation="left"
              domain={[minPrice * 0.98, maxPrice * 1.02]} 
              tick={{ fontSize: 10, fill: '#2563eb' }}
              width={40}
              tickFormatter={(value) => value.toFixed(2)}
            />
            
            {/* 右轴：信号 */}
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              domain={['auto', 'auto']} 
              tick={{ fontSize: 10, fill: '#059669' }}
              width={40}
            />
            
            <Tooltip 
              contentStyle={{ borderRadius: '8px', fontSize: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Legend verticalAlign="top" height={36}/>

            {/* >>> 新增：最高价标尺线 (灰色虚线) <<< */}
            <ReferenceLine 
              yAxisId="left" 
              y={maxPrice} 
              stroke="#9ca3af" 
              strokeDasharray="3 3" 
              strokeWidth={1}
            >
              <Label 
                value={`MAX: ${maxPrice}`} 
                position="insideTopRight" 
                fill="#9ca3af" 
                fontSize={10} 
                offset={10}
              />
            </ReferenceLine>

            {/* >>> 新增：最低价标尺线 (灰色虚线) <<< */}
            <ReferenceLine 
              yAxisId="left" 
              y={minPrice} 
              stroke="#9ca3af" 
              strokeDasharray="3 3" 
              strokeWidth={1}
            >
              <Label 
                value={`MIN: ${minPrice}`} 
                position="insideBottomRight" 
                fill="#9ca3af" 
                fontSize={10} 
                offset={10}
              />
            </ReferenceLine>

            <Line
              yAxisId="left"
              type="monotone"
              dataKey="price"
              name="股价"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
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
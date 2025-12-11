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
  Label,
  Scatter
} from 'recharts';
import { subBusinessDays, format, addMinutes, setHours, setMinutes } from 'date-fns';

interface ChartData {
  timestamp: string;
  displayTime: string;
  price: number;
  signal: number;
  // 新增：用于散点图的特定字段，只有符合条件时才有值，否则为 null
  buyPoint: number | null;
  sellPoint: number | null;
  holdPoint: number | null;
  action: string; // 用于 Tooltip 显示文字
}

const StockPredictionChart = ({ currentSymbol }: { currentSymbol: string }) => {
  const [data, setData] = useState<ChartData[]>([]);

  // 1. 生成数据与信号分类逻辑
  useEffect(() => {
    const generateBacktestedData = () => {
      const result: ChartData[] = [];
      const now = new Date();
      
      let currentPrice = currentSymbol === 'RGTI' ? 1.5 : (currentSymbol === 'QBTS' ? 2.3 : 150.00); 
      
      // 阈值设定：信号绝对值超过此数则触发买卖
      const THRESHOLD = 5; 

      for (let i = 3; i > 0; i--) {
        const dateBase = subBusinessDays(now, i);
        let timeCursor = setMinutes(setHours(dateBase, 9), 30);
        const endTime = setMinutes(setHours(dateBase, 16), 0);

        while (timeCursor <= endTime) {
          const change = (Math.random() - 0.5) * (currentPrice * 0.02);
          currentPrice += change;

          // 模拟信号生成
          const mockMA = currentPrice + (Math.random() - 0.5) * (currentPrice * 0.05); 
          const backtestSignal = (mockMA - currentPrice) * 100; // 放大一点以便观察

          // --- 核心逻辑：判断买/卖/持 ---
          let action = '持有';
          let buyVal = null;
          let sellVal = null;
          let holdVal = null;

          if (backtestSignal > THRESHOLD) {
            action = '买入';
            buyVal = currentPrice; // 只有买入点才有值，其他为null
          } else if (backtestSignal < -THRESHOLD) {
            action = '卖出';
            sellVal = currentPrice;
          } else {
            action = '持有';
            holdVal = currentPrice;
          }

          result.push({
            timestamp: timeCursor.toISOString(),
            displayTime: format(timeCursor, 'MM-dd HH:mm'),
            price: Number(currentPrice.toFixed(2)),
            signal: Number(backtestSignal.toFixed(2)),
            buyPoint: buyVal,
            sellPoint: sellVal,
            holdPoint: holdVal,
            action: action
          });

          timeCursor = addMinutes(timeCursor, 20);
        }
      }
      return result;
    };

    setData(generateBacktestedData());
  }, [currentSymbol]);

  // 2. 计算极值
  const { maxPrice, minPrice } = useMemo(() => {
    if (data.length === 0) return { maxPrice: 0, minPrice: 0 };
    const prices = data.map(d => d.price);
    return {
      maxPrice: Math.max(...prices),
      minPrice: Math.min(...prices)
    };
  }, [data]);

  // 自定义 Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // 找到主要的数据 payload
      const mainData = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg text-xs">
          <p className="font-bold text-gray-700 mb-1">{label}</p>
          <p className="text-blue-600">股价: ${mainData.price}</p>
          <p className="text-gray-500">信号值: {mainData.signal}</p>
          <div className="mt-2 pt-2 border-t border-gray-100 font-bold flex items-center gap-1">
            建议: 
            <span className={`
              px-1.5 py-0.5 rounded text-white
              ${mainData.action === '买入' ? 'bg-green-500' : 
                (mainData.action === '卖出' ? 'bg-red-500' : 'bg-gray-400')}
            `}>
              {mainData.action}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full p-4 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            {currentSymbol} <span className="text-sm font-normal text-gray-500">信号回测</span>
          </h2>
          <div className="flex gap-4 text-xs mt-1 items-center">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> 买入信号</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> 卖出信号</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300"></span> 持有</span>
          </div>
        </div>
      </div>
      
      <div className="flex-1 min-h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 20, right: 0, bottom: 5, left: 0 }}>
            <CartesianGrid stroke="#f5f5f5" strokeDasharray="3 3" />
            
            <XAxis 
              dataKey="displayTime" 
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              minTickGap={40}
            />
            
            <YAxis 
              yAxisId="left" 
              orientation="left"
              domain={[minPrice * 0.98, maxPrice * 1.02]} 
              tick={{ fontSize: 10, fill: '#2563eb' }}
              width={40}
              tickFormatter={(value) => value.toFixed(1)}
            />
            
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              domain={['auto', 'auto']} 
              tick={{ fontSize: 10, fill: '#059669' }}
              width={40}
              hide // 隐藏右轴的具体数值，保持界面在多信号点下整洁，如果想看可以删掉这行
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            {/* 辅助线 */}
            <ReferenceLine yAxisId="left" y={maxPrice} stroke="#e5e7eb" strokeDasharray="3 3">
              <Label value={`High: ${maxPrice}`} position="insideTopRight" fill="#9ca3af" fontSize={10} />
            </ReferenceLine>
            <ReferenceLine yAxisId="left" y={minPrice} stroke="#e5e7eb" strokeDasharray="3 3">
              <Label value={`Low: ${minPrice}`} position="insideBottomRight" fill="#9ca3af" fontSize={10} />
            </ReferenceLine>

            {/* 1. 主股价线 */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="price"
              stroke="#e5e7eb" // 将线变淡，突出信号点
              strokeWidth={2}
              dot={false}
              activeDot={false}
            />

            {/* 2. 买入点 (绿色三角形) */}
            <Scatter 
              yAxisId="left" 
              name="买入" 
              dataKey="buyPoint" 
              fill="#22c55e" // Green
              shape="triangle" // 向上三角
              legendType="triangle"
            />

            {/* 3. 卖出点 (红色倒三角) */}
            <Scatter 
              yAxisId="left" 
              name="卖出" 
              dataKey="sellPoint" 
              fill="#ef4444" // Red
              shape="triangleDown" // 向下三角
              legendType="triangle"
            />

            {/* 4. 持有点 (灰色小圆点) */}
            <Scatter 
              yAxisId="left" 
              name="持有" 
              dataKey="holdPoint" 
              fill="#d1d5db" 
              shape="circle"
              r={2} // 半径设小一点，作为背景噪音
            />

          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StockPredictionChart;
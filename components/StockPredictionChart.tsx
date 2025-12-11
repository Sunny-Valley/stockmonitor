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

// 自定义向下三角形组件（用于卖出信号）
const TriangleDown = (props: any) => {
  const { cx, cy, fill } = props;
  return (
    <path 
      d={`M${cx - 5} ${cy - 4} L${cx + 5} ${cy - 4} L${cx} ${cy + 5} Z`} 
      fill={fill} 
      stroke="none"
    />
  );
};

// 自定义向上三角形组件（用于买入信号）
const TriangleUp = (props: any) => {
  const { cx, cy, fill } = props;
  return (
    <path 
      d={`M${cx - 5} ${cy + 4} L${cx + 5} ${cy + 4} L${cx} ${cy - 5} Z`} 
      fill={fill} 
      stroke="none"
    />
  );
}


interface ChartData {
  timestamp: string;
  displayTime: string;
  price: number;
  signal: number;
  buyPoint: number | null;
  sellPoint: number | null;
  holdPoint: number | null;
  action: string;
}

const StockPredictionChart = ({ currentSymbol }: { currentSymbol: string }) => {
  const [data, setData] = useState<ChartData[]>([]);

  useEffect(() => {
    const generateBacktestedData = () => {
      const result: ChartData[] = [];
      const now = new Date();
      
      // 根据不同股票设置模拟初始价
      let currentPrice = currentSymbol === 'RGTI' ? 1.5 : (currentSymbol === 'QBTS' ? 2.3 : 150.00); 
      
      // 信号阈值：根据实际情况调整。为了演示，这里设置得较低以产生更多信号。
      const THRESHOLD = 2; 

      for (let i = 3; i > 0; i--) {
        const dateBase = subBusinessDays(now, i);
        let timeCursor = setMinutes(setHours(dateBase, 9), 30);
        const endTime = setMinutes(setHours(dateBase, 16), 0);

        while (timeCursor <= endTime) {
          // 1. 模拟股价走势
          const change = (Math.random() - 0.5) * (currentPrice * 0.015);
          currentPrice += change;

          // 2. 模拟信号生成 (这里使用一个更容易触发的模拟逻辑)
          // 实际项目中，这里应替换为您真实的预测模型输出
          const mockSignalNoise = (Math.random() - 0.5) * 10;
          const backtestSignal = mockSignalNoise;

          // --- 核心修复：确保买卖点的值等于当前股价 ---
          let action = '持有';
          let buyVal: number | null = null;
          let sellVal: number | null = null;
          let holdVal: number | null = null;

          if (backtestSignal > THRESHOLD) {
            action = '买入';
            // 【重要】将买入点的值设为当前股价，这样它才会显示在价格线上
            buyVal = currentPrice; 
          } else if (backtestSignal < -THRESHOLD) {
            action = '卖出';
            // 【重要】将卖出点的值设为当前股价
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

  const { maxPrice, minPrice } = useMemo(() => {
    if (data.length === 0) return { maxPrice: 0, minPrice: 0 };
    const prices = data.map(d => d.price);
    return {
      maxPrice: Math.max(...prices),
      minPrice: Math.min(...prices)
    };
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const mainData = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg text-xs">
          <p className="font-bold text-gray-700 mb-1">{label}</p>
          <p className="text-blue-600 font-medium">股价: ${mainData.price}</p>
          <p className="text-gray-500">信号强度: {mainData.signal}</p>
          <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-2">
            <span className="font-bold text-gray-700">建议:</span>
            <span className={`
              px-2 py-0.5 rounded text-white font-medium
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
              // 自动调整Y轴范围，增加一点内边距
              domain={[minPrice * 0.99, maxPrice * 1.01]} 
              tick={{ fontSize: 10, fill: '#2563eb' }}
              width={40}
              tickFormatter={(value) => value.toFixed(2)}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            {/* 图例：使用自定义图标以匹配图表 */}
            <Legend 
              verticalAlign="top" 
              height={36} 
              iconSize={10}
              payload={[
                { value: '买入信号', type: 'triangle', color: '#22c55e' },
                { value: '卖出信号', type: 'triangle', color: '#ef4444', shape: <TriangleDown fill="#ef4444" cx={0} cy={0} /> },
                { value: '持有', type: 'circle', color: '#d1d5db' },
                { value: '股价', type: 'line', color: '#2563eb' }
              ]}
            />
            
            <ReferenceLine yAxisId="left" y={maxPrice} stroke="#e5e7eb" strokeDasharray="3 3">
              <Label value={`High: ${maxPrice}`} position="insideTopRight" fill="#9ca3af" fontSize={10} offset={10}/>
            </ReferenceLine>
            <ReferenceLine yAxisId="left" y={minPrice} stroke="#e5e7eb" strokeDasharray="3 3">
              <Label value={`Low: ${minPrice}`} position="insideBottomRight" fill="#9ca3af" fontSize={10} offset={10}/>
            </ReferenceLine>

            {/* 主股价线 */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="price"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
              activeDot={false}
              name="股价"
            />

            {/* 买入点 (绿色向上三角形) */}
            <Scatter 
              yAxisId="left" 
              name="买入" 
              dataKey="buyPoint" 
              fill="#22c55e" 
              shape={<TriangleUp />}
              legendType="none" // 在自定义图例中处理
            />

            {/* 卖出点 (红色向下三角形) */}
            <Scatter 
              yAxisId="left" 
              name="卖出" 
              dataKey="sellPoint" 
              fill="#ef4444" 
              shape={<TriangleDown />} 
              legendType="none"
            />

            {/* 持有点 (灰色小圆点) */}
            <Scatter 
              yAxisId="left" 
              name="持有" 
              dataKey="holdPoint" 
              fill="#d1d5db" 
              shape="circle"
              r={1.5}
              legendType="none"
            />

          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StockPredictionChart;
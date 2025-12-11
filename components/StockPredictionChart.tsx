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
  ReferenceDot,
  Label,
  Scatter
} from 'recharts';
import { subBusinessDays, format, addMinutes, setHours, setMinutes } from 'date-fns';

// --- 基础形状组件 ---
const TriangleDown = (props: any) => {
  const { cx, cy, fill } = props;
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
  return (
    <path 
      d={`M${cx - 5} ${cy - 4} L${cx + 5} ${cy - 4} L${cx} ${cy + 5} Z`} 
      fill={fill} 
      stroke="none"
    />
  );
};

const TriangleUp = (props: any) => {
  const { cx, cy, fill } = props;
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
  return (
    <path 
      d={`M${cx - 5} ${cy + 4} L${cx + 5} ${cy + 4} L${cx} ${cy - 5} Z`} 
      fill={fill} 
      stroke="none"
    />
  );
}

// --- >>> 新增：呼吸灯标记组件 (用于高亮最新信号) <<< ---
const PulsingMarker = (props: any) => {
  const { cx, cy, fill, action } = props;
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;

  return (
    <g>
      {/* 1. 扩散的波纹环 (呼吸动画) */}
      <circle cx={cx} cy={cy} r="8" fill={fill} opacity="0.5">
        <animate attributeName="r" from="8" to="20" dur="1.5s" begin="0s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.5" to="0" dur="1.5s" begin="0s" repeatCount="indefinite" />
      </circle>
      
      {/* 2. 实心圆点 */}
      <circle cx={cx} cy={cy} r="5" fill={fill} stroke="#fff" strokeWidth="2" />
      
      {/* 3. 文字标签 */}
      <text x={cx + 15} y={cy + 4} fill={fill} fontSize="12" fontWeight="bold" fontFamily="sans-serif">
        ← 最新: {action}
      </text>
    </g>
  );
};

// --- 自定义图例 ---
const renderLegend = () => {
  return (
    <div className="flex justify-center items-center gap-6 text-xs mt-2 text-gray-600">
      <div className="flex items-center gap-1.5">
        <svg width="10" height="10" viewBox="0 0 12 12" className="overflow-visible">
          <path d="M1 10 L6 2 L11 10 Z" fill="#22c55e" />
        </svg>
        <span>买入信号</span>
      </div>
      <div className="flex items-center gap-1.5">
        <svg width="10" height="10" viewBox="0 0 12 12" className="overflow-visible">
          <path d="M1 2 L11 2 L6 10 Z" fill="#ef4444" />
        </svg>
        <span>卖出信号</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-gray-300"></div>
        <span>持有</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-4 h-0.5 bg-blue-600"></div>
        <span>股价</span>
      </div>
    </div>
  );
};

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
      
      let currentPrice = currentSymbol === 'RGTI' ? 1.5 : (currentSymbol === 'QBTS' ? 2.3 : 150.00); 
      const THRESHOLD = 2; 

      for (let i = 3; i > 0; i--) {
        const dateBase = subBusinessDays(now, i);
        let timeCursor = setMinutes(setHours(dateBase, 9), 30);
        const endTime = setMinutes(setHours(dateBase, 16), 0);

        while (timeCursor <= endTime) {
          const change = (Math.random() - 0.5) * (currentPrice * 0.015);
          currentPrice += change;
          const mockSignalNoise = (Math.random() - 0.5) * 10;
          const backtestSignal = mockSignalNoise;

          let action = '持有';
          let buyVal: number | null = null;
          let sellVal: number | null = null;
          let holdVal: number | null = null;

          if (backtestSignal > THRESHOLD) {
            action = '买入';
            buyVal = currentPrice; 
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

  const { maxPrice, minPrice, latestData } = useMemo(() => {
    if (data.length === 0) return { maxPrice: 0, minPrice: 0, latestData: null };
    const prices = data.map(d => d.price);
    return {
      maxPrice: Math.max(...prices),
      minPrice: Math.min(...prices),
      latestData: data[data.length - 1] // 获取最后一个数据点
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
          <ComposedChart data={data} margin={{ top: 20, right: 30, bottom: 5, left: 0 }}>
            <CartesianGrid stroke="#f5f5f5" strokeDasharray="3 3" />
            
            <XAxis 
              dataKey="displayTime" 
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              minTickGap={40}
            />
            
            <YAxis 
              yAxisId="left" 
              orientation="left"
              domain={[minPrice * 0.99, maxPrice * 1.01]} 
              tick={{ fontSize: 10, fill: '#2563eb' }}
              width={40}
              tickFormatter={(value) => value.toFixed(2)}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            <Legend 
              verticalAlign="top" 
              height={36} 
              content={renderLegend}
            />
            
            {/* 最高/最低价 辅助线 */}
            <ReferenceLine yAxisId="left" y={maxPrice} stroke="#e5e7eb" strokeDasharray="3 3">
              <Label value={`High: ${maxPrice}`} position="insideTopRight" fill="#9ca3af" fontSize={10} offset={10}/>
            </ReferenceLine>
            <ReferenceLine yAxisId="left" y={minPrice} stroke="#e5e7eb" strokeDasharray="3 3">
              <Label value={`Low: ${minPrice}`} position="insideBottomRight" fill="#9ca3af" fontSize={10} offset={10}/>
            </ReferenceLine>

            {/* >>> 新增：最新信号高亮 (呼吸灯) <<< */}
            {latestData && (
              <ReferenceDot
                yAxisId="left"
                x={latestData.displayTime}
                y={latestData.price}
                shape={(props: any) => (
                  <PulsingMarker 
                    {...props} 
                    action={latestData.action}
                    // 根据动作决定颜色：买入=绿，卖出=红，持有=灰
                    fill={latestData.action === '买入' ? '#22c55e' : (latestData.action === '卖出' ? '#ef4444' : '#9ca3af')}
                  />
                )}
              />
            )}

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

            {/* 买入点 */}
            <Scatter 
              yAxisId="left" 
              name="买入" 
              dataKey="buyPoint" 
              fill="#22c55e" 
              shape={<TriangleUp />}
            />

            {/* 卖出点 */}
            <Scatter 
              yAxisId="left" 
              name="卖出" 
              dataKey="sellPoint" 
              fill="#ef4444" 
              shape={<TriangleDown />} 
            />

            {/* 持有点 */}
            <Scatter 
              yAxisId="left" 
              name="持有" 
              dataKey="holdPoint" 
              fill="#d1d5db" 
              shape="circle"
              r={1.5}
            />

          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StockPredictionChart;
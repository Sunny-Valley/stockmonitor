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
  return <path d={`M${cx - 5} ${cy - 4} L${cx + 5} ${cy - 4} L${cx} ${cy + 5} Z`} fill={fill} stroke="none"/>;
};

const TriangleUp = (props: any) => {
  const { cx, cy, fill } = props;
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
  return <path d={`M${cx - 5} ${cy + 4} L${cx + 5} ${cy + 4} L${cx} ${cy - 5} Z`} fill={fill} stroke="none"/>;
}

// --- 呼吸灯标记组件 ---
const PulsingMarker = (props: any) => {
  const { cx, cy, fill, action } = props;
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r="8" fill={fill} opacity="0.5">
        <animate attributeName="r" from="8" to="20" dur="1.5s" begin="0s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.5" to="0" dur="1.5s" begin="0s" repeatCount="indefinite" />
      </circle>
      <circle cx={cx} cy={cy} r="5" fill={fill} stroke="#fff" strokeWidth="2" />
    </g>
  );
};

// --- 自定义图例 ---
const renderLegend = () => {
  return (
    <div className="flex justify-center items-center gap-6 text-xs mt-2 text-gray-600">
      <div className="flex items-center gap-1.5"><svg width="10" height="10" viewBox="0 0 12 12" className="overflow-visible"><path d="M1 10 L6 2 L11 10 Z" fill="#22c55e" /></svg><span>买入信号</span></div>
      <div className="flex items-center gap-1.5"><svg width="10" height="10" viewBox="0 0 12 12" className="overflow-visible"><path d="M1 2 L11 2 L6 10 Z" fill="#ef4444" /></svg><span>卖出信号</span></div>
      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-gray-300"></div><span>持有</span></div>
      <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-blue-600"></div><span>股价</span></div>
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
          const backtestSignal = (Math.random() - 0.5) * 10;
          let action = '持有';
          let buyVal: number | null = null;
          let sellVal: number | null = null;
          let holdVal: number | null = null;

          if (backtestSignal > THRESHOLD) {
            action = '买入'; buyVal = currentPrice; 
          } else if (backtestSignal < -THRESHOLD) {
            action = '卖出'; sellVal = currentPrice;
          } else {
            action = '持有'; holdVal = currentPrice;
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
      latestData: data[data.length - 1]
    };
  }, [data]);

  const dateSeparators = useMemo(() => {
    const separators: string[] = [];
    let lastDate = '';
    data.forEach((d) => {
      const currentDate = d.timestamp.split('T')[0];
      if (lastDate && currentDate !== lastDate) separators.push(d.displayTime);
      lastDate = currentDate;
    });
    return separators;
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
            <span className={`px-2 py-0.5 rounded text-white font-medium ${mainData.action === '买入' ? 'bg-green-500' : (mainData.action === '卖出' ? 'bg-red-500' : 'bg-gray-400')}`}>
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
      <div className="mb-2 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            {currentSymbol} <span className="text-sm font-normal text-gray-500">信号回测</span>
          </h2>
        </div>
      </div>
      
      {/* 1. 图表区域 */}
      <div className="flex-1 min-h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 20, right: 30, bottom: 5, left: 0 }}>
            <CartesianGrid stroke="#f5f5f5" strokeDasharray="3 3" />
            <XAxis dataKey="displayTime" tick={{ fontSize: 10, fill: '#9ca3af' }} minTickGap={40} />
            <YAxis yAxisId="left" orientation="left" domain={[minPrice * 0.99, maxPrice * 1.01]} tick={{ fontSize: 10, fill: '#2563eb' }} width={40} tickFormatter={(value) => value.toFixed(2)} />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36} content={renderLegend} />
            
            {/* 日期分隔线 */}
            {dateSeparators.map((time) => (
              <ReferenceLine key={time} x={time} yAxisId="left" stroke="#d1d5db" strokeWidth={2} strokeDasharray="6 4">
                <Label value={time.split(' ')[0]} position="insideTopLeft" fill="#9ca3af" fontSize={10} offset={10} />
              </ReferenceLine>
            ))}

            {/* >>> 修改点：最高价 (红色加粗) <<< */}
            <ReferenceLine yAxisId="left" y={maxPrice} stroke="#fecaca" strokeDasharray="3 3">
              <Label 
                value={`Max: ${maxPrice}`} 
                position="insideTopRight" 
                fill="#ef4444" // 红色文字
                fontWeight="bold" 
                fontSize={11} 
                offset={10}
              />
            </ReferenceLine>

            {/* >>> 修改点：最低价 (绿色加粗) <<< */}
            <ReferenceLine yAxisId="left" y={minPrice} stroke="#bbf7d0" strokeDasharray="3 3">
              <Label 
                value={`Min: ${minPrice}`} 
                position="insideBottomRight" 
                fill="#22c55e" // 绿色文字
                fontWeight="bold" 
                fontSize={11} 
                offset={10}
              />
            </ReferenceLine>

            {/* 最新点高亮 */}
            {latestData && (
              <ReferenceDot yAxisId="left" x={latestData.displayTime} y={latestData.price} shape={(props: any) => (
                  <PulsingMarker {...props} action={latestData.action} fill={latestData.action === '买入' ? '#22c55e' : (latestData.action === '卖出' ? '#ef4444' : '#9ca3af')} />
                )}
              />
            )}

            <Line yAxisId="left" type="monotone" dataKey="price" stroke="#2563eb" strokeWidth={2} dot={false} activeDot={false} name="股价" />
            <Scatter yAxisId="left" name="买入" dataKey="buyPoint" fill="#22c55e" shape={<TriangleUp />} />
            <Scatter yAxisId="left" name="卖出" dataKey="sellPoint" fill="#ef4444" shape={<TriangleDown />} />
            <Scatter yAxisId="left" name="持有" dataKey="holdPoint" fill="#d1d5db" shape="circle" r={1.5} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 2. >>> 新增：底部文字说明区域 <<< */}
      {latestData && (
        <div className={`mt-4 p-4 rounded-lg border flex items-start gap-4 transition-colors
          ${latestData.action === '买入' ? 'bg-green-50 border-green-200' : 
           (latestData.action === '卖出' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200')}
        `}>
          {/* 图标 */}
          <div className={`p-2 rounded-full shrink-0 text-white
            ${latestData.action === '买入' ? 'bg-green-500' : 
             (latestData.action === '卖出' ? 'bg-red-500' : 'bg-gray-400')}
          `}>
            {latestData.action === '买入' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
            ) : latestData.action === '卖出' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/></svg>
            )}
          </div>

          {/* 文字内容 */}
          <div>
            <h4 className={`font-bold text-sm mb-1
              ${latestData.action === '买入' ? 'text-green-800' : 
               (latestData.action === '卖出' ? 'text-red-800' : 'text-gray-700')}
            `}>
              AI 策略建议：{latestData.action} ({latestData.displayTime})
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              当前股价 <strong>${latestData.price}</strong>。
              {latestData.action === '买入' 
                ? '模型检测到明显的底部反转信号，动量指标向上突破，建议在回调时建仓，短期目标看涨。' 
                : latestData.action === '卖出' 
                ? '模型识别到顶部背离形态，抛压逐渐增大，建议获利了结或设置止损保护，规避回调风险。' 
                : '当前市场处于震荡整理阶段，方向尚不明朗。建议保持观望，等待明确的突破信号出现后再行操作。'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockPredictionChart;
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
import { format, isSameDay } from 'date-fns';

// --- 图形组件 (保持不变) ---
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

const renderLegend = () => {
  return (
    <div className="flex justify-center items-center gap-6 text-xs mt-2 text-gray-600">
      <div className="flex items-center gap-1.5"><svg width="10" height="10" viewBox="0 0 12 12" className="overflow-visible"><path d="M1 10 L6 2 L11 10 Z" fill="#22c55e" /></svg><span>AI买入建议</span></div>
      <div className="flex items-center gap-1.5"><svg width="10" height="10" viewBox="0 0 12 12" className="overflow-visible"><path d="M1 2 L11 2 L6 10 Z" fill="#ef4444" /></svg><span>AI卖出建议</span></div>
      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-gray-300"></div><span>持有观望</span></div>
      <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-blue-600"></div><span>Alpaca行情</span></div>
    </div>
  );
};

// --- 数据接口定义 ---
interface ChartData {
  timestamp: string;
  rawTime: number;
  displayTime: string;
  price: number;
  // 以下字段来自 AI 信号数据库
  signal_score: number | null;
  buyPoint: number | null;
  sellPoint: number | null;
  holdPoint: number | null;
  action: string;
  reason: string;
}

interface SignalData {
  timestamp: number;
  action: string;
  reason: string;
  signal_score: number;
}

const StockPredictionChart = ({ currentSymbol }: { currentSymbol: string }) => {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        // 1. 并行请求：股价数据 (Alpaca) 和 AI 信号 (Postgres)
        const [stockRes, signalRes] = await Promise.all([
          fetch(`/api/stock?symbol=${currentSymbol}`),
          fetch(`/api/signals?symbol=${currentSymbol}`)
        ]);

        if (!stockRes.ok) throw new Error('行情数据获取失败');
        
        const rawStockData = await stockRes.json();
        const rawSignalData: SignalData[] = signalRes.ok ? await signalRes.json() : [];

        if (!Array.isArray(rawStockData) || rawStockData.length === 0) {
          setData([]);
          setLoading(false);
          return;
        }

        // 2. 数据合并逻辑 (Data Merging)
        // 将稀疏的 AI 信号映射到密集的 K 线数据上
        const processedData: ChartData[] = rawStockData.map((item: any) => {
          const price = item.price;
          const time = item.timestamp; // 毫秒时间戳
          const dateObj = new Date(time);

          // 在信号列表中查找是否有匹配当前时间点 (+/- 5分钟容差) 的信号
          // 实际生产中 Python 计算的时间戳通常能对齐 K 线收盘时间
          const matchedSignal = rawSignalData.find(s => Math.abs(s.timestamp - time) < 300000);

          let action = matchedSignal?.action || 'HOLD';
          let reason = matchedSignal?.reason || '等待 AI 运算结果...';
          let score = matchedSignal?.signal_score || 0;

          let buyVal: number | null = null;
          let sellVal: number | null = null;
          let holdVal: number | null = null;

          if (action === 'BUY') {
            buyVal = price;
            action = '买入';
          } else if (action === 'SELL') {
            sellVal = price;
            action = '卖出';
          } else {
            action = '持有';
            holdVal = price;
          }

          return {
            timestamp: dateObj.toISOString(),
            rawTime: time,
            displayTime: format(dateObj, 'MM-dd HH:mm'),
            price: price,
            signal_score: score,
            buyPoint: buyVal,
            sellPoint: sellVal,
            holdPoint: holdVal,
            action: action,
            reason: reason
          };
        });

        setData(processedData);
      } catch (err) {
        console.error(err);
        setError('数据同步中...请确保 Python 分析脚本已运行');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentSymbol]);

  // 计算极值与最新点
  const { maxPrice, minPrice, latestData } = useMemo(() => {
    if (data.length === 0) return { maxPrice: 0, minPrice: 0, latestData: null };
    const prices = data.map(d => d.price);
    return {
      maxPrice: Math.max(...prices),
      minPrice: Math.min(...prices),
      latestData: data[data.length - 1]
    };
  }, [data]);

  // 计算日期分隔线
  const dateSeparators = useMemo(() => {
    const separators: string[] = [];
    if (data.length === 0) return separators;
    let lastDateObj = new Date(data[0].rawTime);
    data.forEach((d) => {
      const currentDateObj = new Date(d.rawTime);
      if (!isSameDay(lastDateObj, currentDateObj)) {
        separators.push(d.displayTime);
      }
      lastDateObj = currentDateObj;
    });
    return separators;
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const mainData = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 shadow-xl rounded-lg text-xs z-50 max-w-[250px]">
          <p className="font-bold text-gray-800 mb-2 border-b pb-1">{label}</p>
          
          <div className="flex justify-between mb-1">
            <span className="text-gray-500">价格:</span>
            <span className="text-blue-600 font-mono font-bold">${mainData.price}</span>
          </div>
          
          <div className="flex justify-between mb-2">
            <span className="text-gray-500">AI评分:</span>
            <span className={`font-mono font-bold ${mainData.signal_score > 0 ? 'text-green-600' : (mainData.signal_score < 0 ? 'text-red-600' : 'text-gray-400')}`}>
              {mainData.signal_score || 0}
            </span>
          </div>

          <div className="bg-gray-50 p-2 rounded text-gray-600 italic leading-snug">
             "{mainData.reason}"
          </div>
          
          <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-end">
            <span className={`px-2 py-0.5 rounded text-white font-bold shadow-sm ${mainData.action === '买入' ? 'bg-green-500' : (mainData.action === '卖出' ? 'bg-red-500' : 'bg-gray-400')}`}>
              {mainData.action}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) return <div className="h-full flex items-center justify-center text-gray-400 text-sm">正在同步云端 AI 计算结果...</div>;
  if (error) return <div className="h-full flex items-center justify-center text-red-400 text-sm">{error}</div>;

  return (
    <div className="w-full h-full p-4 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
      <div className="mb-2 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            {currentSymbol} <span className="text-sm font-normal text-gray-500">专业量化回测</span>
          </h2>
        </div>
        <div className="text-xs text-gray-400 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          AI Model: Active
        </div>
      </div>
      
      <div className="flex-1 min-h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 20, right: 30, bottom: 5, left: 0 }}>
            <CartesianGrid stroke="#f5f5f5" strokeDasharray="3 3" />
            <XAxis dataKey="displayTime" tick={{ fontSize: 10, fill: '#9ca3af' }} minTickGap={50} />
            <YAxis yAxisId="left" orientation="left" domain={[minPrice * 0.98, maxPrice * 1.02]} tick={{ fontSize: 10, fill: '#2563eb' }} width={40} tickFormatter={(value) => value.toFixed(2)} />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36} content={renderLegend} />
            
            {dateSeparators.map((time) => (
              <ReferenceLine key={time} x={time} yAxisId="left" stroke="#d1d5db" strokeWidth={2} strokeDasharray="6 4">
                <Label value={time.split(' ')[0]} position="insideTopLeft" fill="#9ca3af" fontSize={10} offset={10} />
              </ReferenceLine>
            ))}

            <ReferenceLine yAxisId="left" y={maxPrice} stroke="#fecaca" strokeDasharray="3 3">
              <Label value={`Max: ${maxPrice}`} position="insideTopRight" fill="#ef4444" fontWeight="bold" fontSize={11} offset={10} />
            </ReferenceLine>

            <ReferenceLine yAxisId="left" y={minPrice} stroke="#bbf7d0" strokeDasharray="3 3">
              <Label value={`Min: ${minPrice}`} position="insideBottomRight" fill="#22c55e" fontWeight="bold" fontSize={11} offset={10} />
            </ReferenceLine>

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

      {/* 底部专业分析说明 - 读取自数据库 */}
      {latestData && (
        <div className={`mt-4 p-4 rounded-lg border flex items-start gap-4 transition-colors
          ${latestData.action === '买入' ? 'bg-green-50 border-green-200' : 
           (latestData.action === '卖出' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200')}
        `}>
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

          <div>
            <h4 className={`font-bold text-sm mb-1
              ${latestData.action === '买入' ? 'text-green-800' : 
               (latestData.action === '卖出' ? 'text-red-800' : 'text-gray-700')}
            `}>
              AI 决策信号：{latestData.action} (Confidence: {Math.abs(latestData.signal_score || 0)}%)
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed font-mono">
              [Model Output] {latestData.reason}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockPredictionChart;
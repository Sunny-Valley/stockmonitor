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

const StockPredictionChart = () => {
  const [data, setData] = useState([]);

  // --- 核心逻辑：数据生成与回测填充 ---
  useEffect(() => {
    const generateBacktestedData = () => {
      const result = [];
      const now = new Date();
      
      // 模拟初始状态
      let currentPrice = 150.00; 
      
      // 循环生成过去5个交易日的数据
      for (let i = 5; i > 0; i--) {
        const dateBase = subBusinessDays(now, i);
        
        // 设置每天的交易时间段：09:30 - 16:00
        let timeCursor = setMinutes(setHours(dateBase, 9), 30);
        const endTime = setMinutes(setHours(dateBase, 16), 0);

        while (timeCursor <= endTime) {
          // 1. 模拟股价波动 (随机游走算法)
          // 实际项目中，这里应该替换为从数据库获取的真实股价
          const change = (Math.random() - 0.5) * 1.5;
          currentPrice += change;

          // 2. 回测/模拟预测信号生成
          // 如果缺乏历史记录，这里使用"均值回归"策略进行回测补充
          // 逻辑：计算短期均线，如果当前价格低于均线，信号看多(正值)，反之看空(负值)
          const mockMA = currentPrice + (Math.random() - 0.5) * 3; // 模拟均线
          const backtestSignal = (mockMA - currentPrice) * 5;      // 计算信号差值

          result.push({
            timestamp: timeCursor.toISOString(),
            displayTime: format(timeCursor, 'MM-dd HH:mm'), // X轴显示格式
            price: Number(currentPrice.toFixed(2)),         // 股价
            signal: Number(backtestSignal.toFixed(2))       // 预测信号
          });

          // 时间步进：20分钟
          timeCursor = addMinutes(timeCursor, 20);
        }
      }
      return result;
    };

    setData(generateBacktestedData());
  }, []);

  return (
    <div className="w-full h-[500px] p-4 bg-white rounded-lg shadow-md border border-gray-200">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-800">智能预测回测分析</h2>
        <p className="text-sm text-gray-500">
          最近5个交易日走势 (20分钟/点) | <span className="text-blue-600">蓝色：实际股价</span> vs <span className="text-green-600">绿色：预测信号历史</span>
        </p>
      </div>
      
      <ResponsiveContainer width="100%" height="85%">
        <ComposedChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid stroke="#f5f5f5" strokeDasharray="3 3" />
          
          {/* X轴：时间 */}
          <XAxis 
            dataKey="displayTime" 
            tick={{ fontSize: 11, fill: '#666' }}
            minTickGap={30} // 自动调整标签间隔，防止重叠
          />

          {/* 左Y轴：股价 */}
          <YAxis 
            yAxisId="left" 
            orientation="left"
            domain={['auto', 'auto']} 
            tick={{ fontSize: 11, fill: '#2563eb' }}
            label={{ value: '股价 ($)', angle: -90, position: 'insideLeft', fill: '#2563eb' }}
          />

          {/* 右Y轴：预测信号 */}
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            domain={['auto', 'auto']} 
            tick={{ fontSize: 11, fill: '#059669' }}
            label={{ value: '预测信号值', angle: 90, position: 'insideRight', fill: '#059669' }}
          />

          <Tooltip 
            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #ddd' }}
            itemStyle={{ fontSize: '12px' }}
            labelStyle={{ fontSize: '12px', color: '#999', marginBottom: '5px' }}
          />
          <Legend verticalAlign="top" height={36}/>

          {/* 曲线1：实际股价 (实线) */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="price"
            name="实际股价"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
          />

          {/* 曲线2：预测信号 (虚线 - 代表历史回测或记录) */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="signal"
            name="预测信号(历史/回测)"
            stroke="#059669"
            strokeWidth={2}
            strokeDasharray="4 4" // 虚线效果
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StockPredictionChart;
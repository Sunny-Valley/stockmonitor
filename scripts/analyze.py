import os
import pandas as pd
import numpy as np
import psycopg2
from alpaca.data.historical import StockHistoricalDataClient
from alpaca.data.requests import StockBarsRequest
from alpaca.data.timeframe import TimeFrame
from datetime import datetime, timedelta

# --- 配置 ---
DATABASE_URL = os.environ.get("POSTGRES_URL") # Vercel Postgres 链接
API_KEY = os.environ.get("ALPACA_API_KEY")
API_SECRET = os.environ.get("ALPACA_API_SECRET")

# --- 核心算法：计算技术指标 ---
def calculate_indicators(df):
    # 1. MACD (趋势指标)
    exp12 = df['close'].ewm(span=12, adjust=False).mean()
    exp26 = df['close'].ewm(span=26, adjust=False).mean()
    df['macd'] = exp12 - exp26
    df['signal_line'] = df['macd'].ewm(span=9, adjust=False).mean()
    
    # 2. Bollinger Bands (波动率指标)
    df['ma20'] = df['close'].rolling(window=20).mean()
    df['std'] = df['close'].rolling(window=20).std()
    df['upper_bb'] = df['ma20'] + (2 * df['std'])
    df['lower_bb'] = df['ma20'] - (2 * df['std'])
    
    # 3. RSI (动量指标)
    delta = df['close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    df['rsi'] = 100 - (100 / (1 + rs))
    
    return df

# --- 核心算法：AI 决策逻辑 ---
def analyze_market(df):
    latest = df.iloc[-1]
    score = 0
    reasons = []

    # 策略 1: MACD 金叉/死叉 (权重 40)
    if latest['macd'] > latest['signal_line']:
        score += 40
        reasons.append("MACD金叉趋势向上")
    else:
        score -= 40
        reasons.append("MACD死叉趋势向下")

    # 策略 2: 布林带突破 (权重 30)
    if latest['close'] < latest['lower_bb']:
        score += 30
        reasons.append("触及布林下轨超跌")
    elif latest['close'] > latest['upper_bb']:
        score -= 30
        reasons.append("触及布林上轨超买")

    # 策略 3: RSI 极端值 (权重 30)
    if latest['rsi'] < 30:
        score += 30
        reasons.append("RSI进入超卖区")
    elif latest['rsi'] > 70:
        score -= 30
        reasons.append("RSI进入超买区")

    # 综合判定
    action = 'HOLD'
    if score >= 50: action = 'BUY'
    elif score <= -50: action = 'SELL'
    
    return score, action, " + ".join(reasons)

def main():
    if not API_KEY or not DATABASE_URL:
        print("Error: 环境变量缺失")
        return

    # 1. 连接数据库获取监控列表
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    cursor.execute("SELECT symbol FROM watchlist")
    symbols = [row[0] for row in cursor.fetchall()]
    
    client = StockHistoricalDataClient(API_KEY, API_SECRET)

    print(f"开始分析股票池: {symbols}")

    for symbol in symbols:
        try:
            # 2. 获取 Alpaca 数据 (过去5天)
            req = StockBarsRequest(
                symbol_or_symbols=symbol,
                timeframe=TimeFrame.Minute, # 分钟级数据更精准
                start=datetime.now() - timedelta(days=5),
                limit=1000
            )
            bars = client.get_stock_bars(req)
            
            if not bars.data:
                continue

            df = pd.DataFrame([
                {'time': b.timestamp, 'close': b.close, 'open': b.open, 'high': b.high, 'low': b.low} 
                for b in bars[symbol]
            ])

            # 3. 运行量化模型
            df = calculate_indicators(df)
            score, action, reason = analyze_market(df)
            
            latest_price = float(df.iloc[-1]['close'])
            latest_time = df.iloc[-1]['time'].to_pydatetime()

            print(f"[{symbol}] 评分:{score} 动作:{action} 理由:{reason}")

            # 4. 存入数据库
            cursor.execute("""
                INSERT INTO ai_signals (symbol, timestamp, price, signal_score, action, reason)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (symbol, timestamp) DO UPDATE 
                SET signal_score = EXCLUDED.signal_score, 
                    action = EXCLUDED.action,
                    reason = EXCLUDED.reason;
            """, (symbol, latest_time, latest_price, score, action, reason))
            
            conn.commit()

        except Exception as e:
            print(f"分析 {symbol} 失败: {e}")

    cursor.close()
    conn.close()
    print("AI 量化分析完成")

if __name__ == "__main__":
    main()
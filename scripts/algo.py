import os
import pandas as pd
from alpaca_trade_api.rest import REST, TimeFrame
from datetime import datetime, timedelta
import psycopg2
import numpy as np

# --- 配置部分 ---
API_KEY = os.getenv("ALPACA_API_KEY")
API_SECRET = os.getenv("ALPACA_API_SECRET")
BASE_URL = "https://paper-api.alpaca.markets"
DB_URL = os.getenv("POSTGRES_URL")

SYMBOLS = ["NVDA", "TSLA", "AAPL", "AMD", "MSFT", "GOOGL", "AMZN", "META", "NFLX", "COIN"]

def get_db_connection():
    if not DB_URL:
        raise ValueError("Database URL is not set")
    return psycopg2.connect(DB_URL)

def init_db(conn):
    """创建前端 page.tsx 需要的 stock_analysis 表"""
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS stock_analysis (
            id SERIAL PRIMARY KEY,
            symbol VARCHAR(10),
            price DECIMAL(10, 2),
            prediction DECIMAL(10, 2),
            signal VARCHAR(10),
            rsi DECIMAL(10, 2),
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()
    cursor.close()

def calculate_rsi(series, period=14):
    """计算 RSI 指标"""
    delta = series.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))

def fetch_and_analyze():
    print("Starting analysis job...")
    
    try:
        api = REST(API_KEY, API_SECRET, BASE_URL)
        conn = get_db_connection()
        init_db(conn)
        cursor = conn.cursor()
    except Exception as e:
        print(f"Initialization failed: {e}")
        return

    # 获取足够的数据来计算 RSI (至少需要过去 20 天)
    end_date = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
    start_date = (datetime.now() - timedelta(days=40)).strftime('%Y-%m-%d')

    for symbol in SYMBOLS:
        try:
            print(f"Analyzing {symbol}...")
            
            # 1. 获取数据 (使用 iex 免费源)
            bars = api.get_bars(
                symbol,
                TimeFrame.Day,
                start=start_date,
                end=end_date,
                adjustment='raw',
                feed='iex' 
            ).df

            if bars.empty or len(bars) < 15:
                print(f"Not enough data for {symbol}")
                continue

            # 2. 计算技术指标 (RSI)
            # 使用收盘价计算
            closes = bars['close']
            rsi_series = calculate_rsi(closes)
            
            current_price = float(closes.iloc[-1])
            current_rsi = float(rsi_series.iloc[-1])
            
            # 如果 RSI 计算结果是 NaN (数据不足)，跳过
            if np.isnan(current_rsi):
                continue

            # 3. 生成简单的量化信号 (策略逻辑)
            # 策略：RSI < 30 超卖(买入), RSI > 70 超买(卖出), 其他(持有)
            signal = "HOLD"
            prediction = current_price # 默认预测价为当前价
            
            if current_rsi < 30:
                signal = "BUY"
                prediction = current_price * 1.05 # 预测涨 5%
            elif current_rsi > 70:
                signal = "SELL"
                prediction = current_price * 0.95 # 预测跌 5%
            else:
                # 中间状态，稍微随机一点波动预测
                prediction = current_price * 1.01

            # 4. 存入 stock_analysis 表
            # 这里的字段必须完全对应 page.tsx 里的 StockRow 接口
            cursor.execute("""
                INSERT INTO stock_analysis (symbol, price, prediction, signal, rsi, updated_at)
                VALUES (%s, %s, %s, %s, %s, NOW());
            """, (
                symbol, 
                round(current_price, 2), 
                round(prediction, 2), 
                signal, 
                round(current_rsi, 2)
            ))
            
            conn.commit()
            print(f"Saved analysis for {symbol}: Price={current_price}, Signal={signal}")

        except Exception as e:
            print(f"Error analyzing {symbol}: {e}")
            conn.rollback()

    cursor.close()
    conn.close()
    print("Analysis job completed.")

if __name__ == "__main__":
    fetch_and_analyze()
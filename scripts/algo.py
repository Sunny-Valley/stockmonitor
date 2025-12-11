import os
import pandas as pd
from alpaca_trade_api.rest import REST, TimeFrame
from datetime import datetime, timedelta
import psycopg2
import numpy as np
import json

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
    """
    更新表结构：增加了 change_percent (涨跌幅) 和 history (历史走势数据)
    注意：为了应用新结构，我会先删除旧表！
    """
    cursor = conn.cursor()
    # 暴力重建表，确保新字段生效
    cursor.execute("DROP TABLE IF EXISTS stock_analysis;")
    
    cursor.execute("""
        CREATE TABLE stock_analysis (
            id SERIAL PRIMARY KEY,
            symbol VARCHAR(10),
            price DECIMAL(10, 2),
            change_percent DECIMAL(10, 2),  -- 新增：涨跌幅
            prediction DECIMAL(10, 2),
            signal VARCHAR(10),
            rsi DECIMAL(10, 2),
            history TEXT,                   -- 新增：存最近7天的 JSON 数据
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()
    cursor.close()

def calculate_rsi(series, period=14):
    delta = series.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))

def fetch_and_analyze():
    print("Starting advanced analysis job...")
    
    try:
        api = REST(API_KEY, API_SECRET, BASE_URL)
        conn = get_db_connection()
        init_db(conn)
        cursor = conn.cursor()
    except Exception as e:
        print(f"Initialization failed: {e}")
        return

    # 获取足够长的数据用于计算 RSI 和 历史走势
    end_date = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
    start_date = (datetime.now() - timedelta(days=40)).strftime('%Y-%m-%d')

    for symbol in SYMBOLS:
        try:
            print(f"Analyzing {symbol}...")
            
            bars = api.get_bars(
                symbol, TimeFrame.Day, start=start_date, end=end_date, adjustment='raw', feed='iex'
            ).df

            if bars.empty or len(bars) < 20:
                print(f"Not enough data for {symbol}")
                continue

            # --- 1. 数据准备 ---
            closes = bars['close']
            current_price = float(closes.iloc[-1])
            prev_price = float(closes.iloc[-2])
            
            # 计算涨跌幅
            change_percent = ((current_price - prev_price) / prev_price) * 100

            # 准备历史走势数据 (取最近 7 个交易日)
            # 格式化为 JSON 字符串: [{"date": "12-01", "price": 100}, ...]
            recent_bars = bars.tail(7)
            history_list = []
            for idx, row in recent_bars.iterrows():
                history_list.append({
                    "date": idx.strftime('%m-%d'), # 日期格式 12-10
                    "price": round(float(row['close']), 2)
                })
            history_json = json.dumps(history_list)

            # --- 2. 技术指标 & 信号 ---
            rsi_series = calculate_rsi(closes)
            current_rsi = float(rsi_series.iloc[-1])
            if np.isnan(current_rsi): continue

            signal = "HOLD"
            prediction = current_price
            if current_rsi < 30:
                signal = "BUY"
                prediction = current_price * 1.05
            elif current_rsi > 70:
                signal = "SELL"
                prediction = current_price * 0.95
            else:
                prediction = current_price * (1 + (np.random.rand() - 0.5) * 0.02)

            # --- 3. 存入数据库 ---
            cursor.execute("""
                INSERT INTO stock_analysis (symbol, price, change_percent, prediction, signal, rsi, history, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, NOW());
            """, (
                symbol, 
                round(current_price, 2), 
                round(change_percent, 2),
                round(prediction, 2), 
                signal, 
                round(current_rsi, 2),
                history_json
            ))
            
            conn.commit()
            print(f"Saved {symbol}: Price={current_price}, Change={change_percent}%")

        except Exception as e:
            print(f"Error analyzing {symbol}: {e}")
            conn.rollback()

    cursor.close()
    conn.close()
    print("Analysis job completed.")

if __name__ == "__main__":
    fetch_and_analyze()
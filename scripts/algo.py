import os
import pandas as pd
from alpaca_trade_api.rest import REST, TimeFrame
from datetime import datetime, timedelta
import psycopg2
import numpy as np
import json

# --- 配置 ---
API_KEY = os.getenv("ALPACA_API_KEY")
API_SECRET = os.getenv("ALPACA_API_SECRET")
BASE_URL = "https://paper-api.alpaca.markets"
DB_URL = os.getenv("POSTGRES_URL")

# 默认保底列表 (如果数据库是空的，就抓这些)
DEFAULT_SYMBOLS = ["NVDA", "TSLA", "AAPL", "AMD", "MSFT", "GOOGL", "AMZN", "META", "NFLX", "COIN"]

def get_db_connection():
    return psycopg2.connect(DB_URL)

def get_symbols_to_track(cursor):
    """
    核心升级：从数据库获取要追踪的股票列表。
    这样前端 UI 添加股票后，脚本就能感知到了。
    """
    try:
        cursor.execute("SELECT DISTINCT symbol FROM stock_analysis")
        rows = cursor.fetchall()
        db_symbols = [row[0] for row in rows]
        
        # 如果数据库里有股票，就更新数据库里的；如果没有，就用默认列表初始化
        if db_symbols:
            # 合并默认列表，防止把默认的删没了 (可选逻辑)
            # return list(set(db_symbols + DEFAULT_SYMBOLS))
            return db_symbols
        else:
            return DEFAULT_SYMBOLS
    except Exception:
        return DEFAULT_SYMBOLS

def init_db(conn):
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS stock_analysis (
            id SERIAL PRIMARY KEY,
            symbol VARCHAR(10),
            price DECIMAL(10, 2),
            change_percent DECIMAL(10, 2),
            prediction DECIMAL(10, 2),
            signal VARCHAR(10),
            rsi DECIMAL(10, 2),
            history TEXT,
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
    print("Starting smart analysis job...")
    
    try:
        api = REST(API_KEY, API_SECRET, BASE_URL)
        conn = get_db_connection()
        init_db(conn)
        cursor = conn.cursor()
        
        # 1. 动态获取股票池
        target_symbols = get_symbols_to_track(cursor)
        print(f"Tracking symbols: {target_symbols}")

    except Exception as e:
        print(f"Initialization failed: {e}")
        return

    end_date = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
    start_date = (datetime.now() - timedelta(days=40)).strftime('%Y-%m-%d')

    for symbol in target_symbols:
        try:
            print(f"Analyzing {symbol}...")
            
            bars = api.get_bars(
                symbol, TimeFrame.Day, start=start_date, end=end_date, adjustment='raw', feed='iex'
            ).df

            # 如果没有数据 (比如刚添加的无效代码)，跳过
            if bars.empty or len(bars) < 5:
                print(f"Not enough data for {symbol}")
                continue

            closes = bars['close']
            current_price = float(closes.iloc[-1])
            prev_price = float(closes.iloc[-2])
            change_percent = ((current_price - prev_price) / prev_price) * 100

            # 生成历史数据 JSON (7天)
            recent_bars = bars.tail(7)
            history_list = []
            for idx, row in recent_bars.iterrows():
                history_list.append({
                    "date": idx.strftime('%m-%d'),
                    "price": round(float(row['close']), 2)
                })
            history_json = json.dumps(history_list)

            # RSI & 信号
            rsi_series = calculate_rsi(closes)
            current_rsi = float(rsi_series.iloc[-1]) if len(bars) > 14 else 50.0

            signal = "HOLD"
            prediction = current_price
            if current_rsi < 30:
                signal = "BUY"
                prediction = current_price * 1.05
            elif current_rsi > 70:
                signal = "SELL"
                prediction = current_price * 0.95
            
            # 存入数据库：这里逻辑改为 UPDATE 为主，如果没有才 INSERT
            # 为了适配前端的“添加”功能，我们先尝试更新。
            cursor.execute("SELECT id FROM stock_analysis WHERE symbol = %s", (symbol,))
            exists = cursor.fetchone()

            if exists:
                cursor.execute("""
                    UPDATE stock_analysis 
                    SET price=%s, change_percent=%s, prediction=%s, signal=%s, rsi=%s, history=%s, updated_at=NOW()
                    WHERE symbol=%s
                """, (round(current_price,2), round(change_percent,2), round(prediction,2), signal, round(current_rsi,2), history_json, symbol))
            else:
                cursor.execute("""
                    INSERT INTO stock_analysis (symbol, price, change_percent, prediction, signal, rsi, history, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                """, (symbol, round(current_price,2), round(change_percent,2), round(prediction,2), signal, round(current_rsi,2), history_json))
            
            conn.commit()
            print(f"Updated {symbol}")

        except Exception as e:
            print(f"Error analyzing {symbol}: {e}")
            conn.rollback()

    cursor.close()
    conn.close()
    print("Analysis job completed.")

if __name__ == "__main__":
    fetch_and_analyze()
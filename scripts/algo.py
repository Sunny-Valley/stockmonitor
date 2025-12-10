import os
import pandas as pd
import alpaca_trade_api as tradeapi
from alpaca_trade_api.rest import REST, TimeFrame  # <--- 修正点1：显式引入 TimeFrame
from datetime import datetime, timedelta
import psycopg2
from urllib.parse import urlparse

# --- 配置部分 ---
# 从环境变量获取 API Key (在 GitHub Secrets 中设置)
API_KEY = os.getenv("ALPACA_API_KEY")
API_SECRET = os.getenv("ALPACA_API_SECRET")
BASE_URL = "https://paper-api.alpaca.markets"  # 或者 https://api.alpaca.markets

# 数据库连接串
DB_URL = os.getenv("POSTGRES_URL")

# 要抓取的股票列表 (根据你的日志补充)
SYMBOLS = ["NVDA", "TSLA", "AAPL", "AMD", "MSFT", "GOOGL", "AMZN", "META", "NFLX", "COIN"]

def get_db_connection():
    """解析连接串并连接数据库"""
    if not DB_URL:
        raise ValueError("Database URL is not set in environment variables")
    
    # 适配 Vercel Postgres (Neon)
    return psycopg2.connect(DB_URL)

def init_db(conn):
    """确保表存在 (根据你的项目需求调整表结构)"""
    cursor = conn.cursor()
    # 创建一个通用的 market_data 表，如果不存在的话
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS market_data (
            symbol VARCHAR(10),
            date DATE,
            open NUMERIC,
            high NUMERIC,
            low NUMERIC,
            close NUMERIC,
            volume BIGINT,
            PRIMARY KEY (symbol, date)
        );
    """)
    conn.commit()
    cursor.close()

def fetch_and_store_data():
    print("Starting data fetch...")
    
    # 初始化 Alpaca API
    api = REST(API_KEY, API_SECRET, BASE_URL)
    
    try:
        conn = get_db_connection()
        init_db(conn) # 确保表存在
        cursor = conn.cursor()
    except Exception as e:
        print(f"Database connection failed: {e}")
        return

    # 设定获取过去 30 天的数据
    end_date = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
    start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')

    for symbol in SYMBOLS:
        try:
            print(f"Fetching data for {symbol}...")
            
            # --- 修正点2：使用正确的 TimeFrame 调用方式 ---
            bars = api.get_bars(
                symbol,
                TimeFrame.Day,  # <--- 原来这里写的是 REST.TimeFrame.Day (报错原因)
                start=start_date,
                end=end_date,
                adjustment='raw'
            ).df

            if bars.empty:
                print(f"No data found for {symbol}")
                continue

            # 遍历每一行数据并插入数据库
            for index, row in bars.iterrows():
                # index 是 timestamp
                date_str = index.date()
                
                # 插入数据 (UPSERT: 如果存在则更新)
                cursor.execute("""
                    INSERT INTO market_data (symbol, date, open, high, low, close, volume)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (symbol, date) 
                    DO UPDATE SET 
                        open = EXCLUDED.open,
                        high = EXCLUDED.high,
                        low = EXCLUDED.low,
                        close = EXCLUDED.close,
                        volume = EXCLUDED.volume;
                """, (
                    symbol, 
                    date_str, 
                    float(row['open']), 
                    float(row['high']), 
                    float(row['low']), 
                    float(row['close']), 
                    int(row['volume'])
                ))
            
            conn.commit()
            print(f"Successfully updated {symbol}")

        except Exception as e:
            print(f"Error on {symbol}: {e}")
            conn.rollback() # 出错回滚

    cursor.close()
    conn.close()
    print("Data update cycle completed.")

if __name__ == "__main__":
    fetch_and_store_data()
import os
import pandas as pd
from alpaca_trade_api.rest import REST, TimeFrame
from datetime import datetime, timedelta
import psycopg2

# --- 配置部分 ---
# 从环境变量获取 API Key (在 GitHub Secrets 中设置)
API_KEY = os.getenv("ALPACA_API_KEY")
API_SECRET = os.getenv("ALPACA_API_SECRET")
# 使用 Paper Trading (模拟盘) 地址
BASE_URL = "https://paper-api.alpaca.markets"

# 数据库连接串
DB_URL = os.getenv("POSTGRES_URL")

# 要抓取的股票列表
SYMBOLS = ["NVDA", "TSLA", "AAPL", "AMD", "MSFT", "GOOGL", "AMZN", "META", "NFLX", "COIN"]

def get_db_connection():
    """解析连接串并连接数据库"""
    if not DB_URL:
        raise ValueError("Database URL is not set in environment variables")
    
    # 适配 Vercel Postgres (Neon)
    return psycopg2.connect(DB_URL)

def init_db(conn):
    """确保表存在"""
    cursor = conn.cursor()
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
    try:
        api = REST(API_KEY, API_SECRET, BASE_URL)
    except Exception as e:
        print(f"Failed to initialize Alpaca API: {e}")
        return
    
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
            
            # --- 关键修正：添加 feed='iex' 以支持免费账户 ---
            bars = api.get_bars(
                symbol,
                TimeFrame.Day,
                start=start_date,
                end=end_date,
                adjustment='raw',
                feed='iex'  # <--- 这里指定使用 IEX (免费数据源)
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
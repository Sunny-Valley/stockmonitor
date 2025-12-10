import os
import sys
import json
import psycopg2
import pytz
import pandas as pd
import pandas_ta as ta
import alpaca_trade_api as tradeapi
from datetime import datetime, time, timedelta
from xgboost import XGBRegressor

# --- 配置部分 ---
# 你的自选股列表
STOCKS = ['NVDA', 'TSLA', 'AAPL', 'AMD', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NFLX', 'COIN']

# 环境变量
DB_URL = os.environ.get("POSTGRES_URL")
API_KEY = os.environ.get("ALPACA_KEY")
API_SECRET = os.environ.get("ALPACA_SECRET")
BASE_URL = "https://paper-api.alpaca.markets"

# --- 1. 市场状态检查 ---
def get_market_status():
    """
    返回: (is_open: bool, message: str)
    """
    tz = pytz.timezone('US/Eastern')
    now = datetime.now(tz)
    
    # 判断周末 (5=周六, 6=周日)
    if now.weekday() >= 5:
        return False, "Weekend"

    # 判断具体时段 (09:30 - 16:00 ET)
    market_start = time(9, 30)
    market_end = time(16, 0)
    
    if market_start <= now.time() <= market_end:
        return True, "Market Open"
    
    return False, "Market Closed"

# --- 2. 检查数据库是否需要补录 ---
def needs_backfill(symbol, is_market_open):
    """
    逻辑：
    1. 如果开盘中 -> 必须运行 (Return True)
    2. 如果休市 -> 检查数据库里最近 24 小时内有没有数据
       - 有数据 -> 不需要运行 (Return False)
       - 没数据 -> 需要回测补录 (Return True)
    """
    if is_market_open:
        return True

    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        # 检查该股票在过去 24 小时内是否有记录
        cur.execute("""
            SELECT id FROM stock_analysis 
            WHERE symbol = %s 
            AND updated_at > NOW() - INTERVAL '24 hours'
            LIMIT 1
        """, (symbol,))
        exists = cur.fetchone()
        conn.close()
        
        if exists:
            print(f"[{symbol}] Data exists for today/yesterday. Skipping backfill.")
            return False
        else:
            print(f"[{symbol}] No recent data found. Running backfill...")
            return True
            
    except Exception as e:
        print(f"DB Check Error (Table might not exist yet): {e}")
        # 如果数据库出错（比如表还没建），默认运行以初始化表
        return True

# --- 3. 核心分析逻辑 ---
def analyze_stock(symbol):
    try:
        api = tradeapi.REST(API_KEY, API_SECRET, BASE_URL, api_version='v2')
        
        # 获取数据 (即使休市，Alpaca 也会返回截止到上一个交易日的最后数据)
        # 15分钟 K线，取最近200根
        barset = api.get_bars(symbol, tradeapi.REST.TimeFrame.Minute * 15, limit=200, adjustment='raw').df
        
        if barset.empty: return None

        # 整理列名
        df = barset.rename(columns={"open": "Open", "high": "High", "low": "Low", "close": "Close", "volume": "Volume"})
        
        # 计算技术指标
        df.ta.rsi(length=14, append=True)
        df.ta.macd(append=True)
        df.ta.bbands(append=True)
        df = df.dropna()

        if len(df) < 50: return None

        # 准备机器学习数据
        feature_cols = ['RSI_14', 'MACD_12_26_9', 'Close']
        X = df[feature_cols]
        y = df['Close'].shift(-1) # 预测下一根K线收盘价

        # 训练模型 (只用最近50条数据，快速适应市场)
        X_train = X.iloc[:-1].tail(50)
        y_train = y.iloc[:-1].tail(50)
        
        model = XGBRegressor(n_estimators=20, max_depth=3)
        model.fit(X_train, y_train)
        
        # 预测当前状态
        current_features = X.iloc[-1].to_frame().T
        predicted_price = model.predict(current_features)[0]
        current_price = df['Close'].iloc[-1]
        
        # 生成信号 (阈值 0.2%)
        threshold = current_price * 0.002
        signal = "HOLD"
        if predicted_price > current_price + threshold:
            signal = "BUY"
        elif predicted_price < current_price - threshold:
            signal = "SELL"

        return {
            "symbol": symbol,
            "price": round(current_price, 2),
            "predict": round(float(predicted_price), 2),
            "signal": signal,
            "rsi": round(df['RSI_14'].iloc[-1], 2)
        }

    except Exception as e:
        print(f"Error on {symbol}: {e}")
        return None

# --- 4. 数据库写入 ---
def save_to_db(results):
    if not results: return
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    
    # 自动建表
    cur.execute("""
        CREATE TABLE IF NOT EXISTS stock_analysis (
            id SERIAL PRIMARY KEY,
            symbol VARCHAR(10),
            price DECIMAL,
            prediction DECIMAL,
            signal VARCHAR(10),
            rsi DECIMAL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    
    # 批量插入
    for r in results:
        cur.execute("""
            INSERT INTO stock_analysis (symbol, price, prediction, signal, rsi)
            VALUES (%s, %s, %s, %s, %s)
        """, (r['symbol'], r['price'], r['predict'], r['signal'], r['rsi']))
        
    conn.commit()
    conn.close()
    print(f"Saved {len(results)} records to DB.")

# --- 主程序入口 ---
if __name__ == "__main__":
    is_open, status_msg = get_market_status()
    print(f"Status: {status_msg}")

    results = []
    
    # 遍历每只股票
    for stock in STOCKS:
        # 即使休市，如果数据库没数据，也强制运行一次(backfill)
        if needs_backfill(stock, is_open):
            res = analyze_stock(stock)
            if res:
                results.append(res)
    
    if results:
        save_to_db(results)
    else:
        print("No updates needed (Market Closed & Data is fresh).")
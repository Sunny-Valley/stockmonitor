import os
import sys
import json
import psycopg2
import pytz
import numpy as np
import pandas as pd
import alpaca_trade_api as tradeapi
from datetime import datetime, time, timedelta
from xgboost import XGBRegressor

# --- 配置部分 ---
STOCKS = ['NVDA', 'TSLA', 'AAPL', 'AMD', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NFLX', 'COIN']

DB_URL = os.environ.get("POSTGRES_URL")
API_KEY = os.environ.get("ALPACA_KEY")
API_SECRET = os.environ.get("ALPACA_SECRET")
BASE_URL = "https://paper-api.alpaca.markets"

# --- 0. 手写技术指标计算函数 (替代 pandas_ta) ---
def calculate_rsi(series, period=14):
    delta = series.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))

def calculate_macd(series, fast=12, slow=26, signal=9):
    exp1 = series.ewm(span=fast, adjust=False).mean()
    exp2 = series.ewm(span=slow, adjust=False).mean()
    macd = exp1 - exp2
    signal_line = macd.ewm(span=signal, adjust=False).mean()
    return macd, signal_line

def calculate_bbands(series, length=20, std=2):
    sma = series.rolling(window=length).mean()
    rstd = series.rolling(window=length).std()
    upper = sma + (rstd * std)
    lower = sma - (rstd * std)
    return upper, lower

# --- 1. 市场状态检查 ---
def get_market_status():
    tz = pytz.timezone('US/Eastern')
    now = datetime.now(tz)
    if now.weekday() >= 5:
        return False, "Weekend"
    market_start = time(9, 30)
    market_end = time(16, 0)
    if market_start <= now.time() <= market_end:
        return True, "Market Open"
    return False, "Market Closed"

# --- 2. 检查数据库 ---
def needs_backfill(symbol, is_market_open):
    if is_market_open: return True
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        cur.execute("SELECT id FROM stock_analysis WHERE symbol = %s AND updated_at > NOW() - INTERVAL '24 hours' LIMIT 1", (symbol,))
        exists = cur.fetchone()
        conn.close()
        return not exists
    except:
        return True

# --- 3. 核心分析逻辑 ---
def analyze_stock(symbol):
    try:
        api = tradeapi.REST(API_KEY, API_SECRET, BASE_URL, api_version='v2')
        # 获取 15分钟 K线
        barset = api.get_bars(symbol, tradeapi.REST.TimeFrame.Minute * 15, limit=200, adjustment='raw').df
        if barset.empty: return None

        df = barset.rename(columns={"open": "Open", "high": "High", "low": "Low", "close": "Close", "volume": "Volume"})
        
        # --- 使用手写函数计算指标 ---
        df['RSI_14'] = calculate_rsi(df['Close'])
        df['MACD'], df['MACD_SIGNAL'] = calculate_macd(df['Close'])
        df['BB_UPPER'], df['BB_LOWER'] = calculate_bbands(df['Close'])
        
        df = df.dropna()
        if len(df) < 50: return None

        # 准备数据
        feature_cols = ['RSI_14', 'MACD', 'Close']
        X = df[feature_cols]
        y = df['Close'].shift(-1)

        X_train = X.iloc[:-1].tail(50)
        y_train = y.iloc[:-1].tail(50)
        
        model = XGBRegressor(n_estimators=20, max_depth=3)
        model.fit(X_train, y_train)
        
        current_features = X.iloc[-1].to_frame().T
        predicted_price = model.predict(current_features)[0]
        current_price = df['Close'].iloc[-1]
        
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
    for r in results:
        cur.execute("INSERT INTO stock_analysis (symbol, price, prediction, signal, rsi) VALUES (%s, %s, %s, %s, %s)", 
                   (r['symbol'], r['price'], r['predict'], r['signal'], r['rsi']))
    conn.commit()
    conn.close()
    print(f"Saved {len(results)} records.")

if __name__ == "__main__":
    is_open, status_msg = get_market_status()
    print(f"Status: {status_msg}")
    results = []
    for stock in STOCKS:
        if needs_backfill(stock, is_open):
            res = analyze_stock(stock)
            if res: results.append(res)
    save_to_db(results)
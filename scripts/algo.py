import os
import sys
import json
import psycopg2
import pytz
import pandas as pd
import pandas_ta as ta
import alpaca_trade_api as tradeapi
from datetime import datetime, time
from xgboost import XGBRegressor

# --- 配置部分 ---
# 你的自选股列表
STOCKS = ['NVDA', 'TSLA', 'AAPL', 'AMD', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NFLX', 'COIN']

# 从环境变量获取机密信息
DB_URL = os.environ.get("POSTGRES_URL")
API_KEY = os.environ.get("ALPACA_KEY")
API_SECRET = os.environ.get("ALPACA_SECRET")
BASE_URL = "https://paper-api.alpaca.markets" # 必填：使用模拟盘地址

# --- 1. 时间门卫：只在美股交易时段运行 ---
def is_market_open():
    tz = pytz.timezone('US/Eastern')
    now = datetime.now(tz)
    
    # 周末不运行
    if now.weekday() >= 5:
        return False, "Weekend"

    # 交易时间: 09:30 - 16:00 ET
    market_start = time(9, 30)
    market_end = time(16, 0)
    
    if market_start <= now.time() <= market_end:
        return True, "Market Open"
    return False, "Market Closed"

# --- 2. 获取数据与AI分析 ---
def analyze_stock(symbol):
    try:
        api = tradeapi.REST(API_KEY, API_SECRET, BASE_URL, api_version='v2')
        
        # 获取 15分钟 K线，取最近200根
        barset = api.get_bars(symbol, tradeapi.REST.TimeFrame.Minute * 15, limit=200, adjustment='raw').df
        if barset.empty: return None

        # 整理数据格式
        df = barset.rename(columns={"open": "Open", "high": "High", "low": "Low", "close": "Close", "volume": "Volume"})
        
        # 计算技术指标
        df.ta.rsi(length=14, append=True)
        df.ta.macd(append=True)
        df.ta.bbands(append=True)
        df = df.dropna()

        # 简单的机器学习准备
        # 特征：RSI, MACD, 收盘价
        feature_cols = ['RSI_14', 'MACD_12_26_9', 'Close']
        X = df[feature_cols]
        y = df['Close'].shift(-1) # 预测下一根K线的收盘价

        # 训练模型 (使用最后50条数据快速训练)
        X_train = X.iloc[:-1].tail(50)
        y_train = y.iloc[:-1].tail(50)
        current_features = X.iloc[-1].to_frame().T
        
        model = XGBRegressor(n_estimators=20, max_depth=3)
        model.fit(X_train, y_train)
        predicted_price = model.predict(current_features)[0]
        
        # 生成信号
        current_price = df['Close'].iloc[-1]
        threshold = current_price * 0.002 # 0.2% 的波动阈值
        
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

# --- 3. 数据库操作 ---
def save_to_db(results):
    if not results: return
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    
    # 自动建表（如果不存在）
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
    
    # 插入数据
    for r in results:
        cur.execute("""
            INSERT INTO stock_analysis (symbol, price, prediction, signal, rsi)
            VALUES (%s, %s, %s, %s, %s)
        """, (r['symbol'], r['price'], r['predict'], r['signal'], r['rsi']))
        
    conn.commit()
    conn.close()
    print("Data saved to DB.")

# --- 主程序 ---
if __name__ == "__main__":
    # 1. 检查时间
    open_status, msg = is_market_open()
    if not open_status:
        print(f"Skipping: {msg}")
        sys.exit(0)
    
    print("Market Open. Starting analysis...")
    results = []
    for stock in STOCKS:
        res = analyze_stock(stock)
        if res: results.append(res)
        
    save_to_db(results)
    print("Done.")
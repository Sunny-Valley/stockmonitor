import psycopg2
import sys

# !!! 关键步骤 !!!
# 请去 Vercel 后台 -> Settings -> Environment Variables
# 复制 POSTGRES_URL 的值 (以 postgres:// 开头)，粘贴在下面引号里
DATABASE_URL = "postgresql://neondb_owner:npg_oxlUJkB54iLF@ep-bitter-snow-ad437et1-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"

def init_db():
    if "在此处粘贴" in DATABASE_URL:
        print("❌ 错误: 请先在脚本第 7 行填入真实的 DATABASE_URL")
        return

    try:
        print("正在连接数据库...")
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        # 1. 创建 ai_signals 表
        print("正在创建 ai_signals 表...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ai_signals (
              id SERIAL PRIMARY KEY,
              symbol VARCHAR(20) NOT NULL,
              timestamp TIMESTAMP NOT NULL,
              price DECIMAL,
              signal_score DECIMAL,
              action VARCHAR(10),
              reason TEXT,
              created_at TIMESTAMP DEFAULT NOW(),
              UNIQUE(symbol, timestamp)
            );
        """)

        # 2. 顺手把 watchlist 表也建了 (防止之前没建成功)
        print("正在检查 watchlist 表...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS watchlist (
              symbol VARCHAR(20) PRIMARY KEY,
              name VARCHAR(100),
              added_at TIMESTAMP DEFAULT NOW()
            );
        """)
        
        # 3. 插入测试数据
        cursor.execute("""
            INSERT INTO ai_signals (symbol, timestamp, price, signal_score, action, reason)
            VALUES ('TEST', NOW(), 100.00, 99, 'BUY', 'Codespaces init success')
            ON CONFLICT (symbol, timestamp) DO NOTHING;
        """)
        
        conn.commit()
        print("✅ 成功！数据库表初始化完成。")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ 发生错误: {e}")

if __name__ == "__main__":
    init_db()
"""
開発時のみ使用：yfinance で 7203.T の過去2年データを取得して CSV を保存します。
ネットワークやYahoo側の制限等で取得できない場合は、同等の分布感を持つ合成データに自動フォールバックします。
配布物には生成された CSV を同梱し、デモ時はネット不要とします。
"""
from datetime import datetime, timedelta
from pathlib import Path
import argparse
import numpy as np
import pandas as pd
import yfinance as yf


def fetch_yf(ticker: str, period: str = '2y', interval: str = '1d') -> pd.DataFrame:
    # まず download API を試す
    df = yf.download(ticker, period=period, interval=interval, auto_adjust=False, actions=False, progress=False, threads=False)
    if isinstance(df, pd.DataFrame) and not df.empty and 'Close' in df.columns:
        return df
    # 次に Ticker.history を試す
    t = yf.Ticker(ticker)
    end = datetime.utcnow().date()
    start = end - timedelta(days=365*2 + 7)
    df2 = t.history(start=start.isoformat(), end=end.isoformat(), interval=interval)
    return df2


def generate_synth(days: int = 500, seed: int = 42, start_price: float = 2000.0) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    # ランダムウォーク + 週次季節性 + ゆるやかなトレンド
    steps = rng.normal(loc=0.2, scale=10.0, size=days)
    price = np.cumsum(steps) + start_price
    # 週次のリズム（sin波）
    weekly = 20 * np.sin(np.arange(days) * 2 * np.pi / 5)
    price = np.maximum(100.0, price + weekly)
    # 営業日ベースの日付
    end = datetime.utcnow().date()
    dates = pd.bdate_range(end=end, periods=days).sort_values()
    out = pd.DataFrame({
        'Date': dates.strftime('%Y-%m-%d'),
        'Close': np.round(price[-len(dates):], 1)
    })
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ticker', default='7203.T')
    ap.add_argument('--period', default='2y')
    ap.add_argument('--interval', default='1d')
    ap.add_argument('--no-fallback', action='store_true', help='yfinance 失敗時に合成データへフォールバックしない')
    args = ap.parse_args()

    out = Path(__file__).resolve().parents[1] / 'assets' / 'sample' / 'toyota_7203.csv'
    out.parent.mkdir(parents=True, exist_ok=True)

    try:
        raw = fetch_yf(args.ticker, period=args.period, interval=args.interval)
        if raw is None or raw.empty:
            raise RuntimeError('No data returned')
        df = raw.reset_index()
        # yfinance の返り値は Date/DatetimeIndex の場合がある
        date_col = 'Date' if 'Date' in df.columns else 'index' if 'index' in df.columns else df.columns[0]
        if 'Close' not in df.columns:
            raise RuntimeError('Close column missing in Yahoo response')
        df = df[[date_col, 'Close']].rename(columns={date_col: 'Date'})
        df['Date'] = pd.to_datetime(df['Date']).dt.strftime('%Y-%m-%d')
        df.to_csv(out, index=False)
        print(f'Saved (Yahoo): {out}  rows={len(df)}')
    except Exception as e:
        if args.no_fallback:
            raise SystemExit(f'Fetch failed and fallback disabled: {e}')
        # 合成データにフォールバック
        synth = generate_synth(days=520)
        synth.to_csv(out, index=False)
        print(f'Saved (Synthetic fallback): {out}  rows={len(synth)}')


if __name__ == '__main__':
    main()

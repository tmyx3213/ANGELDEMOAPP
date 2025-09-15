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
    ap.add_argument('--all-columns', action='store_true', help='CSV出力時に列を絞らず全列を保存する（デフォルトは Date, Close のみ）')
    ap.add_argument('--output', default='', help='出力CSVパス（未指定なら assets/sample/toyota_7203.csv）')
    args = ap.parse_args()

    out = Path(args.output) if args.output else (Path(__file__).resolve().parents[1] / 'assets' / 'sample' / 'toyota_7203.csv')
    out.parent.mkdir(parents=True, exist_ok=True)

    try:
        raw = fetch_yf(args.ticker, period=args.period, interval=args.interval)
        if raw is None or raw.empty:
            raise RuntimeError('No data returned')
        df = raw.copy()
        # flatten columns if MultiIndex
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = ['_'.join([str(x) for x in tpl if str(x) != '']).strip() for tpl in df.columns.values]
        # reset index to a proper Date column
        df = df.reset_index()
        # standardize datetime column name to 'Date'
        if 'Date' not in df.columns:
            # yfinance sometimes uses 'index' or returns DatetimeIndex
            idx_name = 'index' if 'index' in df.columns else df.columns[0]
            df = df.rename(columns={idx_name: 'Date'})
        # convert to date string (keep time if present)
        if np.issubdtype(pd.to_datetime(df['Date'], errors='coerce').dtype, np.datetime64):
            # keep full ISO format if time exists; else YYYY-MM-DD
            dt = pd.to_datetime(df['Date'], errors='coerce')
            if (dt.dt.time != pd.Timestamp(0).time()).any():
                df['Date'] = dt.dt.tz_localize(None, ambiguous='NaT', nonexistent='shift_forward').dt.strftime('%Y-%m-%d %H:%M:%S')
            else:
                df['Date'] = dt.dt.strftime('%Y-%m-%d')
        # limit columns or keep all
        if not args.all_columns:
            if 'Close' not in df.columns:
                raise RuntimeError('Close column missing in Yahoo response')
            df = df[['Date', 'Close']]
        out.parent.mkdir(parents=True, exist_ok=True)
        df.to_csv(out, index=False)
        print(f'Saved (Yahoo): {out}  rows={len(df)}  cols={list(df.columns)}')
    except Exception as e:
        if args.no_fallback:
            raise SystemExit(f'Fetch failed and fallback disabled: {e}')
        # 合成データにフォールバック
        synth = generate_synth(days=520)
        out.parent.mkdir(parents=True, exist_ok=True)
        synth.to_csv(out, index=False)
        print(f'Saved (Synthetic fallback): {out}  rows={len(synth)}  cols={list(synth.columns)}')


if __name__ == '__main__':
    main()

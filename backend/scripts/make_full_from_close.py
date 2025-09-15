"""
既存の Date, Close だけのCSVから、Open/High/Low/Close/Volume を擬似生成して
フルカラムのテスト用CSVを作るユーティリティ（オフライン用）。

使用例:
  python backend/scripts/make_full_from_close.py \
      --input assets/sample/toyota_7203.csv \
      --output assets/sample/toyota_full_7203.csv
"""
from pathlib import Path
import argparse
import numpy as np
import pandas as pd


def make_full(df: pd.DataFrame, seed: int = 42) -> pd.DataFrame:
    if 'Date' not in df.columns or 'Close' not in df.columns:
        raise ValueError('Input CSV must contain Date and Close columns')
    out = df.copy()
    out = out.sort_values('Date').reset_index(drop=True)
    rng = np.random.default_rng(seed)
    # Open は前日の Close を基準に微小なギャップを加える
    prev_close = out['Close'].shift(1).fillna(out['Close']).astype(float)
    gap = rng.normal(loc=0.0, scale=max(0.001, out['Close'].std() * 0.01), size=len(out))
    open_px = (prev_close + gap).astype(float)
    # 高値/安値は Open/Close の周辺でランダムに広げる（順序を保つ）
    base = np.vstack([open_px.values, out['Close'].astype(float).values]).T
    spread = np.maximum(0.01, np.std(out['Close'].astype(float)) * 0.02)
    high_extra = np.abs(rng.normal(loc=spread, scale=spread * 0.5, size=len(out)))
    low_extra = np.abs(rng.normal(loc=spread * 0.8, scale=spread * 0.4, size=len(out)))
    high_px = np.max(base, axis=1) + high_extra
    low_px = np.minimum.reduce([open_px.values, out['Close'].astype(float).values]) - low_extra
    # Volume は水準に比例したノイズ付きで生成
    lvl = np.maximum(1.0, out['Close'].astype(float) / np.nanmean(out['Close'].astype(float)))
    vol = (lvl * 1_000_000 * (1 + rng.normal(0.0, 0.25, size=len(out)))).astype(int)

    full = pd.DataFrame({
        'Date': pd.to_datetime(out['Date']).dt.strftime('%Y-%m-%d'),
        'Open': np.round(open_px, 2),
        'High': np.round(np.maximum.reduce([high_px, open_px.values, out['Close'].astype(float).values]), 2),
        'Low': np.round(np.minimum.reduce([low_px, open_px.values, out['Close'].astype(float).values]), 2),
        'Close': np.round(out['Close'].astype(float).values, 2),
        'Volume': vol
    })
    # 高値 >= max(Open, Close), 安値 <= min(Open, Close) を保証
    full['High'] = full[['High', 'Open', 'Close']].max(axis=1)
    full['Low'] = full[['Low', 'Open', 'Close']].min(axis=1)
    return full


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--input', default=str(Path(__file__).resolve().parents[1] / 'assets' / 'sample' / 'toyota_7203.csv'))
    ap.add_argument('--output', default=str(Path(__file__).resolve().parents[1] / 'assets' / 'sample' / 'toyota_full_7203.csv'))
    ap.add_argument('--seed', type=int, default=42)
    args = ap.parse_args()

    inp = Path(args.input)
    if not inp.exists():
        raise SystemExit(f'Input CSV not found: {inp}')
    df = pd.read_csv(inp)
    full = make_full(df, seed=args.seed)
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    full.to_csv(out, index=False)
    print(f'Saved: {out} rows={len(full)} cols={list(full.columns)}')


if __name__ == '__main__':
    main()


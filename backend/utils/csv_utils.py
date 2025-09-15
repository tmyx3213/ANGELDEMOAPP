from typing import List, Tuple
import pandas as pd


def preview_csv(df: pd.DataFrame, limit: int = 5) -> Tuple[List[str], list]:
    cols = list(df.columns)
    head = df.head(limit).fillna('').values.tolist()
    return cols, head


def normalize(df: pd.DataFrame, date_col: str, value_col: str) -> pd.DataFrame:
    d = df[[date_col, value_col]].copy()
    d = d.rename(columns={date_col: 'ds', value_col: 'y'})
    # parse date
    d['ds'] = pd.to_datetime(d['ds'], errors='coerce')
    d = d.dropna(subset=['ds', 'y'])
    # sort and dedupe by date (keep last)
    d = d.sort_values('ds')
    d = d.drop_duplicates(subset=['ds'], keep='last')
    return d


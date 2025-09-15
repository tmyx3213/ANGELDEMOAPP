from typing import Dict
import pandas as pd
import numpy as np
from datetime import timedelta
from utils.csv_utils import normalize
import logging

logger = logging.getLogger("forecast")


def run_prophet_forecast(df: pd.DataFrame, date_col: str, value_col: str, horizon_days: int = 30) -> Dict:
    data = normalize(df, date_col, value_col)

    def fallback_response(data_norm: pd.DataFrame, horizon: int, reason: str) -> Dict:
        logger.warning("Prophet fallback: reason=%s rows=%s horizon=%s", reason, data_norm.shape[0], horizon)
        hist_df = data_norm[['ds', 'y']].copy()
        # 直近30点で簡易線形トレンド＋分散で帯を作る
        recent = hist_df.tail(30)
        if recent.empty:
            level = float(hist_df['y'].mean()) if not hist_df.empty else 0.0
            slope = 0.0
            sigma = 0.0
        else:
            y = recent['y'].values.astype(float)
            x = np.arange(len(y)).astype(float)
            try:
                coef = np.polyfit(x, y, 1)
                slope, intercept = coef[0], coef[1]
                level = float(y[-1])
            except Exception:
                slope, intercept = 0.0, float(y.mean())
                level = float(y[-1])
            sigma = float(np.std(y - (slope * x + intercept), ddof=1)) if len(y) > 1 else 0.0

        last_date = hist_df['ds'].max() if not hist_df.empty else pd.Timestamp.today().normalize()
        future_dates = [(last_date + timedelta(days=i+1)).strftime('%Y-%m-%d') for i in range(int(horizon))]
        # 線形トレンドを延長
        start_idx = len(recent) - 1
        yhat_list = [float(level + slope * (i+1)) for i in range(int(horizon))]
        lower = [y - 1.96 * sigma for y in yhat_list]
        upper = [y + 1.96 * sigma for y in yhat_list]

        hist_out = hist_df.copy()
        hist_out['ds'] = hist_out['ds'].dt.strftime('%Y-%m-%d')
        forecast_out = [
            {"ds": d, "yhat": yh, "yhat_lower": lo, "yhat_upper": up}
            for d, yh, lo, up in zip(future_dates, yhat_list, lower, upper)
        ]

        latest = hist_out['y'].iloc[-1] if len(hist_out) else None
        horizon_point = yhat_list[-1] if yhat_list else None
        delta_pct = None
        if latest is not None and horizon_point is not None and latest != 0:
            delta_pct = round((horizon_point - latest) / latest * 100, 1)
        summary = "-"
        if delta_pct is not None:
            direction = "+" if delta_pct >= 0 else ""
            summary = f"30日（簡易）予測中央値は最新終値比 {direction}{delta_pct}%。"

        warnings = [f"Prophetが利用できないため、簡易予測（移動平均/線形外挿）にフォールバックしました。理由: {reason}"]
        if data_norm.shape[0] < horizon * 2:
            warnings.append("データ量が少ないため、予測期間の短縮を推奨します。")

        return {
            "history": hist_out.to_dict(orient='records'),
            "forecast": forecast_out,
            "summaryText": summary,
            "warnings": warnings,
            "diagnostics": {"outliers": 0, "missing": 0, "deduped": 0},
        }

    # Prophet トライ。失敗したらフォールバック
    try:
        from prophet import Prophet
    except Exception as e:
        logger.exception("Prophet import error")
        return fallback_response(data, horizon_days, reason=f"import error: {e}")

    try:
        if data.shape[0] < max(10, horizon_days):
            # データが極端に少ない場合はフォールバック
            return fallback_response(data, horizon_days, reason="too few rows")
        model = Prophet()
        model.fit(data)
        future = model.make_future_dataframe(periods=int(horizon_days))
        fc = model.predict(future)
    except Exception as e:
        logger.exception("Prophet fit/predict error")
        return fallback_response(data, horizon_days, reason=f"fit/predict error: {e}")

    hist = data[['ds', 'y']].copy()
    hist['ds'] = hist['ds'].dt.strftime('%Y-%m-%d')
    forecast = fc[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].copy()
    forecast['ds'] = forecast['ds'].dt.strftime('%Y-%m-%d')

    latest = hist['y'].iloc[-1] if len(hist) else None
    horizon_point = forecast.iloc[-1]['yhat'] if len(forecast) else None
    delta_pct = None
    if latest is not None and horizon_point is not None and latest != 0:
        delta_pct = round((horizon_point - latest) / latest * 100, 1)
    summary = "-"
    if delta_pct is not None:
        direction = "+" if delta_pct >= 0 else ""
        summary = f"30日予測中央値は最新終値比 {direction}{delta_pct}%。全体傾向は参考程度にご覧ください。"

    diagnostics = {"outliers": 0, "missing": 0, "deduped": 0}
    warnings = []
    if data.shape[0] < horizon_days * 2:
        warnings.append("データ量が少ないため、予測期間の短縮を推奨します。")

    return {
        "history": hist.to_dict(orient='records'),
        "forecast": forecast.to_dict(orient='records'),
        "summaryText": summary,
        "warnings": warnings,
        "diagnostics": diagnostics,
    }

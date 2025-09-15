from __future__ import annotations
from typing import Dict, List, Tuple
import numpy as np
import pandas as pd


def _safe_float(x):
    try:
        return float(x)
    except Exception:
        return None


def compute_profile(data: pd.DataFrame) -> Dict:
    # data: columns ds (datetime64), y (float)
    y = data['y'].astype(float)
    rows = int(len(data))
    date_min = data['ds'].min()
    date_max = data['ds'].max()
    mean = _safe_float(np.nanmean(y))
    median = _safe_float(np.nanmedian(y))
    vmin = _safe_float(np.nanmin(y))
    vmax = _safe_float(np.nanmax(y))
    std = _safe_float(np.nanstd(y, ddof=1) if rows > 1 else 0.0)
    cv = _safe_float((std / mean) if mean not in (None, 0) else None)
    # simple outlier count by IQR
    q1, q3 = np.nanpercentile(y, [25, 75]) if rows >= 4 else (None, None)
    iqr = (q3 - q1) if (q1 is not None and q3 is not None) else None
    lower = q1 - 1.5 * iqr if iqr is not None else None
    upper = q3 + 1.5 * iqr if iqr is not None else None
    outliers = int(((y < lower) | (y > upper)).sum()) if lower is not None else 0
    return {
        'rows': rows,
        'date_min': date_min.strftime('%Y-%m-%d') if pd.notna(date_min) else None,
        'date_max': date_max.strftime('%Y-%m-%d') if pd.notna(date_max) else None,
        'mean': mean, 'median': median, 'min': vmin, 'max': vmax,
        'std': std, 'cv': cv,
        'missing': 0, 'duplicates': 0, 'outliers': outliers,
    }


def compute_trend(data: pd.DataFrame) -> Dict:
    y = data['y'].astype(float).values
    n = len(y)
    # slope over last up to 30 points
    window = min(30, max(2, n))
    if n < 2:
        slope = 0.0
    else:
        yy = y[-window:]
        x = np.arange(len(yy), dtype=float)
        try:
            slope = float(np.polyfit(x, yy, 1)[0])
        except Exception:
            slope = 0.0
    # delta over ~3 months (~63 business days)
    lookback = min(n - 1, 63) if n > 1 else 0
    if lookback > 0 and y[-lookback-1] != 0:
        delta_3mo_pct = float((y[-1] - y[-lookback-1]) / y[-lookback-1] * 100)
    else:
        delta_3mo_pct = None
    return {
        'slope_30d': slope,
        'delta_3mo_pct': delta_3mo_pct,
        'changepoints': [],  # placeholder (optional)
    }


def compute_seasonality(data: pd.DataFrame) -> Dict:
    d = data.copy()
    d['weekday'] = d['ds'].dt.weekday  # Mon=0
    by_wd = d.groupby('weekday')['y'].mean()
    weekday_mean = by_wd.loc[[0,1,2,3,4]].mean() if set([0,1,2,3,4]).issubset(by_wd.index) else None
    weekend_mean = by_wd.loc[[5,6]].mean() if set([5,6]).issubset(by_wd.index) else None
    weekend_delta_pct = None
    if weekday_mean and weekend_mean:
        weekend_delta_pct = float((weekend_mean - weekday_mean) / weekday_mean * 100) if weekday_mean else None
    # crude acf at lag 7
    acf7 = None
    if len(d) > 14:
        y = d['y'].values.astype(float)
        y0 = y[:-7] - y[:-7].mean()
        y1 = y[7:] - y[7:].mean()
        denom = (np.linalg.norm(y0) * np.linalg.norm(y1))
        if denom != 0:
            acf7 = float(np.dot(y0, y1) / denom)
    # strength labels
    def label_from_val(val):
        if val is None:
            return '不明'
        a = abs(val)
        if a >= 0.5:
            return '強'
        if a >= 0.2:
            return '中'
        return '弱'
    weekly_strength = label_from_val(acf7)
    return {
        'weekly_strength': weekly_strength,
        'weekend_delta_pct': weekend_delta_pct,
        'acf7': acf7,
    }


def summarize_forecast(data: pd.DataFrame, fc: pd.DataFrame, horizon_days: int) -> Dict:
    # future part is last horizon_days rows
    future = fc.tail(int(horizon_days)).copy() if len(fc) >= horizon_days else fc.copy()
    def pick(i):
        if len(future) == 0:
            return None, None, None
        idx = min(i-1, len(future)-1)
        row = future.iloc[idx]
        return float(row['yhat']), float(row['yhat_lower']), float(row['yhat_upper'])
    p50_5, lo_5, up_5 = pick(5)
    p50_30, lo_30, up_30 = pick(30)
    # band ratio median
    if len(future) > 0:
        ratio = (future['yhat_upper'] - future['yhat_lower']).abs() / future['yhat'].abs().replace(0, np.nan)
        band_ratio = float(np.nanmedian(ratio)) if ratio.notna().any() else None
    else:
        band_ratio = None
    # confidence
    def conf_from_band(r):
        if r is None:
            return '不明'
        if r < 0.1:
            return '高'
        if r < 0.2:
            return '中'
        return '低'
    confidence = conf_from_band(band_ratio)

    latest = data['y'].iloc[-1] if len(data) else None
    delta_30_pct = float((p50_30 - latest) / latest * 100) if (latest not in (None, 0) and p50_30 is not None) else None

    return {
        'p50_5': p50_5, 'lo_5': lo_5, 'up_5': up_5,
        'p50_30': p50_30, 'lo_30': lo_30, 'up_30': up_30,
        'delta_30_pct': delta_30_pct,
        'band_ratio': band_ratio,
        'confidence': confidence,
    }


def generate_explanations(profile: Dict, trend: Dict, seas: Dict, fsum: Dict) -> Dict:
    # Business tone (multi-paragraph)
    p_rows = profile.get('rows')
    p_range = f"{profile.get('date_min')}〜{profile.get('date_max')}"
    p_stats = f"平均 {round(profile.get('mean', 0), 2)}、中央値 {round(profile.get('median', 0), 2)}、最小 {round(profile.get('min', 0), 2)}、最大 {round(profile.get('max', 0), 2)}。標準偏差 {round(profile.get('std', 0), 2)}、変動係数 {round((profile.get('cv') or 0), 2)}。"
    p_quality = f"欠損 {profile.get('missing')} 件、重複 {profile.get('duplicates')} 件、外れ値 {profile.get('outliers')} 件。"
    s_line = f"週次の季節性は{seas.get('weekly_strength')}で、週末は平日比 {round((seas.get('weekend_delta_pct') or 0), 1)}% です。"
    t_line = f"直近30日の傾きは {round(trend.get('slope_30d') or 0, 4)}、直近3か月の変化率は {round((trend.get('delta_3mo_pct') or 0), 1)}% でした。"
    f_line = f"5日先の予測中央値は {round((fsum.get('p50_5') or 0), 2)}（{round((fsum.get('lo_5') or 0), 2)}〜{round((fsum.get('up_5') or 0), 2)}）。30日先は {round((fsum.get('p50_30') or 0), 2)}（{round((fsum.get('lo_30') or 0), 2)}〜{round((fsum.get('up_30') or 0), 2)}）で、最新値比 {round((fsum.get('delta_30_pct') or 0), 1)}% です。"
    c_line = f"信頼度は {fsum.get('confidence')}（帯幅比 {round((fsum.get('band_ratio') or 0), 3)}）。"

    business = "\n\n".join([
        f"データ概要：期間 {p_range}（{p_rows} 件）。",
        p_stats,
        p_quality,
        s_line,
        t_line,
        f_line,
        c_line,
    ])

    technical = "\n\n".join([
        f"基本統計: mean={round(profile.get('mean') or 0, 3)}, median={round(profile.get('median') or 0, 3)}, std={round(profile.get('std') or 0, 3)}, cv={round((profile.get('cv') or 0), 3)}",
        f"seasonality: acf7={round((seas.get('acf7') or 0), 3)}, weekend_delta_pct={round((seas.get('weekend_delta_pct') or 0), 2)}",
        f"trend: slope_30d={round((trend.get('slope_30d') or 0), 6)}, delta_3mo_pct={round((trend.get('delta_3mo_pct') or 0), 3)}",
        f"forecast: p50_5={fsum.get('p50_5')}, p50_30={fsum.get('p50_30')}, band_ratio={round((fsum.get('band_ratio') or 0), 4)}, confidence={fsum.get('confidence')}",
    ])

    # Rich narrative script for report mode (inspired by detailed report style)
    
    # データ特性の判定
    mean_val = profile.get('mean') or 0
    median_val = profile.get('median') or 0
    cv_val = profile.get('cv') or 0
    distribution_comment = "比較的対称的な分布" if abs(mean_val - median_val) / max(mean_val, 1) < 0.1 else "やや偏りのある分布"
    variation_level = "安定的" if cv_val < 0.15 else "やや変動が大きい" if cv_val < 0.3 else "変動の大きい"
    
    weekend_pct = seas.get('weekend_delta_pct') or 0
    seasonality_strength = seas.get('weekly_strength', '不明')
    seasonality_comment = f"明確な週次パターン（週末 +{abs(weekend_pct):.1f}%）" if seasonality_strength == '強' else f"週次の変動（{weekend_pct:+.1f}%）" if seasonality_strength == '中' else "季節性は限定的"
    
    delta_3mo = trend.get('delta_3mo_pct') or 0
    trend_direction = "上昇傾向" if delta_3mo > 2 else "下降傾向" if delta_3mo < -2 else "横ばい傾向"
    
    forecast_confidence = fsum.get('confidence', '不明')
    prediction_reliability = "高い精度" if forecast_confidence == '高' else "中程度の精度" if forecast_confidence == '中' else "限定的な精度"
    
    script = [
        {
            "id": "opening", 
            "text": f"✨ 分析が完了しました。今回扱ったのは{p_range}の{p_rows}件のデータです。全体を概観してみましょう。", 
            "highlight": ["profile.rows"], 
            "waitMs": 4000
        },
        {
            "id": "data_overview", 
            "text": f"📊 データの特徴を見ると、平均{mean_val:.1f}、中央値{median_val:.1f}で、{distribution_comment}になっています。", 
            "highlight": ["profile.mean", "profile.median"], 
            "waitMs": 4500
        },
        {
            "id": "variation_analysis", 
            "text": f"変動係数は{cv_val:.2f}で、統計的には「{variation_level}」データといえます。これは予測の信頼性にも影響します。", 
            "highlight": ["profile.cv"], 
            "waitMs": 5000
        },
        {
            "id": "seasonality_analysis", 
            "text": f"🔍 パターン分析では{seasonality_comment}が見られます。これは予測モデルの重要な手がかりとなります。", 
            "highlight": ["seasonality.weekly_strength"], 
            "waitMs": 5500
        },
        {
            "id": "trend_analysis", 
            "text": f"📈 長期的には{trend_direction}で、直近3ヶ月では{delta_3mo:+.1f}%の変化となっています。", 
            "highlight": ["trend.delta_3mo_pct"], 
            "waitMs": 4500
        },
        {
            "id": "forecast_results", 
            "text": f"🔮 予測結果として、30日先の中央値は{fsum.get('p50_30', 0):.1f}で、最新値から{fsum.get('delta_30_pct', 0):+.1f}%の変化が見込まれます。", 
            "highlight": ["forecast.p50_30", "forecast.delta_30_pct"], 
            "waitMs": 6000
        },
        {
            "id": "reliability_assessment", 
            "text": f"⚖️ 今回の予測は{prediction_reliability}での結果となっており、実用的な見通しとして活用できると考えられます。", 
            "highlight": ["forecast.confidence"], 
            "waitMs": 5000
        },
        {
            "id": "conclusion", 
            "text": f"📝 以上の分析から、データの特性を踏まえた将来予測をお届けしました。詳細は右上の「詳細レポート」もご参照ください。", 
            "highlight": [], 
            "waitMs": 5500
        }
    ]

    targets = {
        # keys map to data-metric on frontend components
        'profile.rows': ["[data-metric='profile.rows']"],
        'profile.range': ["[data-metric='profile.range']"],
        'profile.mean': ["[data-metric='profile.mean']"],
        'profile.median': ["[data-metric='profile.median']"],
        'profile.std': ["[data-metric='profile.std']"],
        'profile.cv': ["[data-metric='profile.cv']"],
        'seasonality.weekly_strength': ["[data-metric='seasonality.weekly_strength']"],
        'seasonality.weekend_delta_pct': ["[data-metric='seasonality.weekend_delta_pct']"],
        'trend.slope_30d': ["[data-metric='trend.slope_30d']"],
        'trend.delta_3mo_pct': ["[data-metric='trend.delta_3mo_pct']"],
        'forecast.p50_5': ["[data-metric='forecast.p50_5']"],
        'forecast.p50_30': ["[data-metric='forecast.p50_30']"],
        'forecast.delta_30_pct': ["[data-metric='forecast.delta_30_pct']"],
        'forecast.confidence': ["[data-metric='forecast.confidence']"],
        'forecast.band_ratio': ["[data-metric='forecast.band_ratio']"],
    }

    return {
        'business': business,
        'technical': technical,
        'narrativeScript': script,
        'targets': targets,
    }


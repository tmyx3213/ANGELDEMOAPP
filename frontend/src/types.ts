export type PreviewResponse = {
  columns: string[];
  headRows: (string | number | null)[][];
  meta?: { rows: number; encoding?: string };
}

export type ForecastPoint = { ds: string; yhat: number; yhat_lower: number; yhat_upper: number }
export type HistoryPoint = { ds: string; y: number }

export type ForecastResponse = {
  history: HistoryPoint[];
  forecast: ForecastPoint[];
  summaryText: string;
  warnings: string[];
  diagnostics?: { outliers: number; missing: number; deduped: number };
  profile?: {
    rows: number; date_min: string | null; date_max: string | null;
    mean: number | null; median: number | null; min: number | null; max: number | null;
    std: number | null; cv: number | null; missing: number; duplicates: number; outliers: number;
  };
  seasonality?: { weekly_strength: string; weekend_delta_pct: number | null; acf7: number | null };
  trend?: { slope_30d: number | null; delta_3mo_pct: number | null; changepoints?: { date: string; delta_slope: number }[] };
  forecast_summary?: {
    p50_5: number | null; lo_5: number | null; up_5: number | null;
    p50_30: number | null; lo_30: number | null; up_30: number | null;
    delta_30_pct: number | null; band_ratio: number | null; confidence: string;
  };
  explanations?: { business: string; technical: string };
  narrativeScript?: { id: string; text: string; highlight: string[]; waitMs: number }[];
  targets?: Record<string, string[]>;
}

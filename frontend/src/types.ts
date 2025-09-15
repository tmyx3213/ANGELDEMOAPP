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
}


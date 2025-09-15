import os
import logging
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
import pandas as pd
from typing import List

from utils.csv_utils import preview_csv
from services.prophet_service import run_prophet_forecast

PORT = int(os.environ.get('PORT', '8765'))
ROOT = Path(__file__).resolve().parent
FRONT_DIST = (ROOT.parent / 'frontend' / 'dist')
ASSETS = ROOT / 'assets'

app = FastAPI(title='NLP Analytics MVP', version='0.1.0')
logger = logging.getLogger("app")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)

# CORS（フロント開発サーバ用）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"]
)


@app.post('/api/preview')
async def api_preview(file: UploadFile = File(...)):
    try:
        df = pd.read_csv(file.file)
    except Exception as e:
        logger.exception("/api/preview: CSV parse failed")
        raise HTTPException(status_code=400, detail={"code": "INVALID_CSV", "message": str(e)})
    columns, head_rows = preview_csv(df, limit=10)
    return {"columns": columns, "headRows": head_rows, "meta": {"rows": int(df.shape[0])}}


@app.post('/api/forecast')
async def api_forecast(
    file: UploadFile = File(...),
    dateCol: str = Form(...),
    valueCol: str = Form(...),
    horizonDays: int = Form(30)
):
    try:
        df = pd.read_csv(file.file)
    except Exception as e:
        logger.exception("/api/forecast: CSV parse failed")
        raise HTTPException(status_code=400, detail={"code": "INVALID_CSV", "message": str(e)})
    if dateCol not in df.columns or valueCol not in df.columns:
        logger.error("/api/forecast: BAD_COLUMNS dateCol=%s valueCol=%s available=%s", dateCol, valueCol, list(df.columns))
        raise HTTPException(status_code=400, detail={"code": "BAD_COLUMNS", "message": "指定された列が見つかりません"})

    try:
        logger.info("/api/forecast: start dateCol=%s valueCol=%s horizon=%s rows=%s", dateCol, valueCol, horizonDays, df.shape[0])
        result = run_prophet_forecast(df, date_col=dateCol, value_col=valueCol, horizon_days=horizonDays)
    except Exception as e:
        logger.exception("/api/forecast: exception")
        raise HTTPException(status_code=500, detail={"code": "FORECAST_ERROR", "message": str(e)})
    return JSONResponse(result)


@app.get('/api/sample/toyota')
async def api_sample_toyota():
    sample = ASSETS / 'sample' / 'toyota_7203.csv'
    if not sample.exists():
        raise HTTPException(status_code=404, detail='Sample not found')
    return FileResponse(sample, media_type='text/csv', filename='toyota_7203.csv')


# 静的配信（ビルド済みフロント）
if FRONT_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONT_DIST), html=True), name="static")
else:
    @app.get('/')
    async def root():
        return HTMLResponse('<html><body><h3>フロント未ビルドです</h3><p>開発時は Vite を実行、もしくは frontend を build してください。</p></body></html>')

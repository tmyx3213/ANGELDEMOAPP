# Backend

FastAPI アプリケーション。フロントのビルド物を静的配信し、CSV のプレビュー/予測 API を提供します。

## 開発実行

```bash
python -m venv .venv
. .venv/Scripts/activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8765
```

## サンプルCSVの生成（開発時のみ）

```bash
python scripts/fetch_toyota_csv.py
```

生成された `assets/sample/toyota_7203.csv` が GET `/api/sample/toyota` から配信されます。

## EXE 化（概要）

- PyInstaller で `main.py` をエントリにビルドします。
- `frontend/dist` と `assets/`、cmdstan を一緒に同梱してください。
- 起動時は `CMDSTAN` 環境変数を同梱パスに設定することを推奨します。


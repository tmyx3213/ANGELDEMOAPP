# 自然言語データ分析アプリ（MVP）

Windows 単体実行を想定したデモ用アプリのひな形です。

## 構成
- frontend: React + TypeScript + Vite + MUI + Plotly
- backend: FastAPI + pandas + Prophet（将来: PyInstaller + pywebview で EXE 化）

## 使い方（開発）

1) フロントエンド（別ターミナル）

```bash
cd frontend
npm ci
npm run dev
```

2) バックエンド（別ターミナル）

```bash
cd backend
python -m venv .venv
. .venv/Scripts/activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8765
```

3) ブラウザで http://localhost:5173 を開く（フロント dev サーバ）

バックエンド API は http://127.0.0.1:8765 下で待ち受けます。

## ビルド（フロント）

```bash
cd frontend
npm run build
```

生成物は `frontend/dist/` に出力されます。FastAPI は同フォルダを静的配信に利用します。

## サンプルCSV（オフライン実行用）

- `backend/assets/sample/toyota_7203.csv` に 7203.T（トヨタ）相当のサンプルを同梱しています。
- 実データを生成する場合は、開発環境でネット接続の上、`backend/scripts/fetch_toyota_csv.py` を実行し、ファイルを置き換えてください。

## パッケージング（将来/概要）

- PyInstaller で `backend/main.py` を EXE 化し、`frontend/dist` と `backend/assets` を同梱します。
- cmdstan を `backend/vendor/` に同梱し、環境変数 `CMDSTAN` を起動時に設定します。
- 起動時に FastAPI をローカルで立ち上げ、pywebview の内蔵ウィンドウでフロントを表示します。


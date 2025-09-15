"""
Windows単体実行向けのブートストラップ。
FastAPI サーバを起動し、pywebview で内蔵ウィンドウにフロントを表示します。
PyInstaller でこのファイルをエントリに EXE 化します。
"""
import os
import threading
import time
import webview
import uvicorn


def run_server():
    uvicorn.run("app:app", host="127.0.0.1", port=8765, log_level="info")


def main():
    t = threading.Thread(target=run_server, daemon=True)
    t.start()
    # サーバ起動待ち
    time.sleep(1.5)
    webview.create_window("自然言語データ分析（MVP）", url="http://127.0.0.1:8765")
    webview.start()


if __name__ == '__main__':
    main()


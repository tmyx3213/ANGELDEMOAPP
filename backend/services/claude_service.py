import os
import json
from typing import Dict, Optional
import anthropic
from anthropic import Anthropic


class ClaudeReportGenerator:
    def __init__(self):
        """Initialize Claude API client with API key from environment."""
        api_key = os.getenv('ANTHROPIC_API_KEY')
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY environment variable is required")
        self.client = Anthropic(api_key=api_key)

    def generate_detailed_report(
        self,
        profile: Dict,
        trend: Dict,
        seasonality: Dict,
        forecast_summary: Dict,
        data_preview: Optional[str] = None
    ) -> str:
        """
        Generate a detailed analysis report using Claude 4 Sonnet.

        Args:
            profile: Data profile statistics
            trend: Trend analysis results
            seasonality: Seasonality analysis results
            forecast_summary: Forecast summary statistics
            data_preview: Optional preview of the raw data

        Returns:
            Detailed markdown report as string
        """

        # Prepare analysis context for Claude
        analysis_context = {
            "data_profile": {
                "rows": profile.get('rows', 0),
                "date_range": f"{profile.get('date_min')} ~ {profile.get('date_max')}",
                "mean": profile.get('mean'),
                "median": profile.get('median'),
                "std": profile.get('std'),
                "cv": profile.get('cv'),
                "min": profile.get('min'),
                "max": profile.get('max'),
                "outliers": profile.get('outliers', 0)
            },
            "trend_analysis": {
                "slope_30d": trend.get('slope_30d'),
                "delta_3mo_pct": trend.get('delta_3mo_pct')
            },
            "seasonality_analysis": {
                "weekly_strength": seasonality.get('weekly_strength'),
                "weekend_delta_pct": seasonality.get('weekend_delta_pct'),
                "acf7": seasonality.get('acf7')
            },
            "forecast_results": {
                "p50_5": forecast_summary.get('p50_5'),
                "p50_30": forecast_summary.get('p50_30'),
                "delta_30_pct": forecast_summary.get('delta_30_pct'),
                "confidence": forecast_summary.get('confidence'),
                "band_ratio": forecast_summary.get('band_ratio')
            }
        }

        prompt = f"""
あなたは時系列データ分析の専門家です。以下の分析結果を基に、ビジネス向けの詳細な分析レポートを日本語で作成してください。

# 分析データ概要
```json
{json.dumps(analysis_context, ensure_ascii=False, indent=2)}
```

# レポート要件
- **マークダウン形式**で出力
- **2000-3000文字程度**の詳細なレポート
- **ビジネスパーソン向け**の実用的な内容
- 以下のセクションを含める：
  1. エグゼクティブサマリー
  2. データ特性分析
  3. トレンド・季節性分析
  4. 予測結果と信頼性評価
  5. ビジネスインプリケーション
  6. リスク要因と注意点
  7. 推奨アクション

# 分析の視点
- データの統計的特性を平易に解説
- ビジネス上の意味合いを重視
- 予測の不確実性とリスクを明記
- 具体的なアクションプランを提示
- 専門用語は分かりやすく説明

レポートを作成してください。
"""

        try:
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=4000,
                temperature=0.7,
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )

            claude_response = response.content[0].text
            print(f"Claude API Success! Response length: {len(claude_response)} chars")
            print(f"Claude response preview: {claude_response[:200]}...")
            return claude_response

        except Exception as e:
            # Log the error and fallback to basic report if API fails
            print(f"Claude API Error: {e}")
            return self._generate_fallback_report(analysis_context)

    def _generate_fallback_report(self, context: Dict) -> str:
        """Generate a basic fallback report if Claude API is unavailable."""
        profile = context["data_profile"]
        trend = context["trend_analysis"]
        forecast = context["forecast_results"]

        return f"""# データ分析レポート

## エグゼクティブサマリー

{profile["date_range"]}の期間における{profile["rows"]}件のデータを分析しました。

## 主要指標

- **平均値**: {profile["mean"]:.2f}
- **中央値**: {profile["median"]:.2f}
- **標準偏差**: {profile["std"]:.2f}
- **変動係数**: {profile["cv"]:.3f}

## 予測結果

30日先の予測値は{forecast["p50_30"]:.2f}で、現在値から{forecast["delta_30_pct"]:+.1f}%の変化が見込まれます。

予測の信頼度は{forecast["confidence"]}となっています。

## 注意事項

Claude APIが利用できないため、簡易レポートを表示しています。
詳細な分析には環境変数ANTHROPIC_API_KEYの設定が必要です。
"""


def generate_claude_report(profile: Dict, trend: Dict, seasonality: Dict, forecast_summary: Dict) -> str:
    """
    Convenience function to generate Claude report.
    Returns fallback report if Claude API is not configured.
    """
    try:
        generator = ClaudeReportGenerator()
        return generator.generate_detailed_report(profile, trend, seasonality, forecast_summary)
    except ValueError as e:
        # API key not configured
        return f"""# データ分析レポート

## お知らせ

詳細なAI分析レポートを生成するには、環境変数 `ANTHROPIC_API_KEY` の設定が必要です。

現在は基本的な分析結果のみ表示されています。

### 設定方法
```bash
export ANTHROPIC_API_KEY=your_api_key_here
```

## 基本分析結果

- データ件数: {profile.get('rows', 0)}件
- 期間: {profile.get('date_min')} ~ {profile.get('date_max')}
- 30日予測: {forecast_summary.get('delta_30_pct', 0):+.1f}%の変化見込み
"""
    except Exception as e:
        return f"""# データ分析レポート

## エラー

AI分析レポートの生成中にエラーが発生しました。

エラー詳細: {str(e)}

基本的な分析結果をご確認ください。
"""
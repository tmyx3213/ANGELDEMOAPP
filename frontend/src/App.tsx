import React, { useMemo, useState } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import { theme } from './theme'
import { AppBar, Box, Button, Card, CardContent, Container, CssBaseline, Divider, LinearProgress, Tab, Tabs, TextField, Toolbar, Typography, Chip, Dialog, DialogTitle, DialogContent, DialogActions, IconButton } from '@mui/material'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import Stepper from '@mui/material/Stepper'
import CloseIcon from '@mui/icons-material/Close'
import Papa from 'papaparse'
import Plot from 'react-plotly.js'
import type { ForecastResponse, PreviewResponse } from './types'

const steps = [
  '① データ読み込み',
  '② データ性質の選択',
  '③ 分析手法の選択',
  '④ データ列の設定',
  '⑤ 実行',
]

export default function App() {
  const [tab, setTab] = useState(0)
  const [activeStep, setActiveStep] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [dateCol, setDateCol] = useState<string>('')
  const [valueCol, setValueCol] = useState<string>('')
  const [horizon, setHorizon] = useState<number>(30)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ForecastResponse | null>(null)
  const [reportMode, setReportMode] = useState(false)
  const [currentScript, setCurrentScript] = useState(0)
  const [highlightedMetrics, setHighlightedMetrics] = useState<string[]>([])
  const [summaryModalOpen, setSummaryModalOpen] = useState(false)
  const progress = useMemo(() => ((activeStep + 1) / steps.length) * 100, [activeStep])

  const onUpload = async (f: File) => {
    setFile(f)
    // quick local preview (first 10 rows) while backend also parses
    Papa.parse(f, {
      header: true,
      preview: 10,
      complete: (res) => {
        const columns = res.meta.fields || []
        const rows = (res.data as any[]).map(r => columns.map(c => r[c] ?? null))
        setPreview({ columns, headRows: rows, meta: undefined })
      }
    })
    const form = new FormData()
    form.append('file', f)
    try {
      const r = await fetch('/api/preview', { method: 'POST', body: form })
      if (r.ok) {
        const json = await r.json() as PreviewResponse
        setPreview(json)
        // auto-pick likely columns
        const d = json.columns.find(c => /date|日時|日付|time|timestamp/i.test(c)) || json.columns[0]
        const v = json.columns.find(c => /close|終|value|price|y/i.test(c)) || json.columns[1] || json.columns[0]
        setDateCol(d || '')
        setValueCol(v || '')
      }
    } catch {}
  }

  const canNext = () => {
    switch (activeStep) {
      case 0: return !!file
      case 1: return true // 時系列のみ
      case 2: return true // Prophet固定
      case 3: return !!dateCol && !!valueCol
      case 4: return true
      default: return false
    }
  }

  const runForecast = async () => {
    if (!file || !dateCol || !valueCol) return
    setBusy(true)
    setTab(1)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('dateCol', dateCol)
      form.append('valueCol', valueCol)
      form.append('horizonDays', String(horizon))
      const r = await fetch('/api/forecast', { method: 'POST', body: form })
      const json = await r.json() as ForecastResponse
      setResult(json)
    } catch (e) {
      setResult({ history: [], forecast: [], summaryText: 'エラーが発生しました。', warnings: ['API呼び出しに失敗しました。'] })
    } finally {
      setBusy(false)
    }
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static" color="transparent" elevation={0}>
        <Toolbar>
          <Typography variant="h1" sx={{ flex: 1, fontSize: 20 }}>自然言語データ分析（MVP）</Typography>
          <Button onClick={() => window.open('/api/sample/toyota')}>サンプルを読み込む</Button>
          <Button onClick={() => alert('ヘルプは準備中です')}>ヘルプ</Button>
        </Toolbar>
        <LinearProgress variant="determinate" value={progress} sx={{ height: 4, bgcolor: '#E6F7FB' }} />
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)}>
            <Tab label="設定" />
            <Tab label="結果" />
          </Tabs>
          
          {/* 右上のボタンエリア（結果タブでのみ表示） */}
          {tab === 1 && result && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                variant="outlined" 
                size="small"
                onClick={() => setSummaryModalOpen(true)}
              >
                📄 詳細レポート
              </Button>
              {result.narrativeScript && (
                <Button 
                  variant="contained" 
                  size="small"
                  color={reportMode ? "secondary" : "primary"}
                  onClick={() => {
                    setReportMode(!reportMode)
                    if (!reportMode) {
                      setCurrentScript(0)
                      // 最初のスクリプトのハイライトを適用
                      const firstScript = result.narrativeScript?.[0]
                      if (firstScript) {
                        setHighlightedMetrics(firstScript.highlight)
                      }
                    } else {
                      setHighlightedMetrics([])
                    }
                  }}
                >
                  {reportMode ? '📊 通常表示' : '🎭 報告モード'}
                </Button>
              )}
            </Box>
          )}
        </Box>
        <Divider sx={{ mb: 2 }} />

        {tab === 0 && (
          <Box>
            <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
              {steps.map((label) => (
                <Step key={label}><StepLabel>{label}</StepLabel></Step>
              ))}
            </Stepper>

            {activeStep === 0 && (
              <Card><CardContent>
                <Typography variant="h2" gutterBottom>📂 データを投入してください！</Typography>
                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  <Button variant="contained" component="label">
                    ファイルを選択
                    <input type="file" accept=".csv" hidden onChange={(e)=>{
                      const f = e.target.files?.[0]; if (f) onUpload(f)
                    }} />
                  </Button>
                  <Button onClick={async ()=>{
                    const r = await fetch('/api/sample/toyota');
                    const blob = await r.blob();
                    const f = new File([blob], 'toyota_7203.csv', { type: 'text/csv' });
                    onUpload(f)
                  }}>サンプルを読み込む（7203.T／過去2年）</Button>
                </Box>
                <Box sx={{ mt: 3 }}>
                  <Typography variant="body1" gutterBottom>プレビュー（先頭10行）</Typography>
                  {preview ? (
                    <Box component="table" sx={{ width: '100%', overflowX: 'auto', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>{preview.columns.map(c => <th key={c} style={{textAlign:'left', borderBottom:'1px solid #E6EEF2', padding:'8px'}}>{c}</th>)}</tr>
                      </thead>
                      <tbody>
                        {preview.headRows.map((row, i) => (
                          <tr key={i}>{row.map((v, j) => <td key={j} style={{borderBottom:'1px solid #F0F4F7', padding:'8px'}}>{String(v ?? '')}</td>)}</tr>
                        ))}
                      </tbody>
                    </Box>
                  ) : <Typography color="text.secondary">CSVを選択すると先頭10行を表示します</Typography>}
                </Box>
              </CardContent></Card>
            )}

            {activeStep === 1 && (
              <Card><CardContent>
                <Typography variant="h2" gutterBottom>このデータはどんな性質ですか？</Typography>
                <Box sx={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(280px, 1fr))', gap: 2 }}>
                  <Button variant="outlined" onClick={()=>setActiveStep(2)} sx={{height:80}}>📈 時系列データ（選択）</Button>
                  <Button variant="outlined" disabled sx={{height:80}}>📊 カテゴリ比較（デモでは無効）</Button>
                  <Button variant="outlined" disabled sx={{height:80}}>🧑‍🤝‍🧑 顧客属性（デモでは無効）</Button>
                  <Button variant="outlined" disabled sx={{height:80}}>🗺️ 地理データ（デモでは無効）</Button>
                  <Button variant="outlined" disabled sx={{height:80}}>🔄 ネットワーク（デモでは無効）</Button>
                </Box>
              </CardContent></Card>
            )}

            {activeStep === 2 && (
              <Card><CardContent>
                <Typography variant="h2" gutterBottom>どの手法で分析しますか？</Typography>
                <Typography gutterBottom>本デモでは最終的に Prophet を使用します（他の選択肢は説明のみ）。</Typography>
                <Box sx={{ display:'flex', flexDirection:'column', gap:1 }}>
                  <Button variant="outlined" onClick={()=>setActiveStep(3)}>Prophet（推奨）</Button>
                  <Button variant="outlined" onClick={()=>setActiveStep(3)}>移動平均</Button>
                  <Button variant="outlined" onClick={()=>setActiveStep(3)}>線形回帰</Button>
                  <Button variant="outlined" onClick={()=>setActiveStep(3)}>AIおまかせ</Button>
                </Box>
              </CardContent></Card>
            )}

            {activeStep === 3 && (
              <Card><CardContent>
                <Typography variant="h2" gutterBottom>データ列の設定（Prophet）</Typography>
                <Box sx={{display:'flex', gap:2, flexWrap:'wrap'}}>
                  <TextField size="small" label="日付列" value={dateCol} onChange={e=>setDateCol(e.target.value)} placeholder="Date" />
                  <TextField size="small" label="値の列" value={valueCol} onChange={e=>setValueCol(e.target.value)} placeholder="Close" />
                  <TextField size="small" label="予測期間（日）" type="number" value={horizon} onChange={e=>setHorizon(Number(e.target.value))} />
                </Box>
                {/* データプレビュー */}
                <Box sx={{ mt: 3 }}>
                  <Typography variant="body1" gutterBottom>プレビュー（先頭10行）</Typography>
                  {preview ? (
                    <Box component="table" sx={{ width: '100%', overflowX: 'auto', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>{preview.columns.map(c => <th key={c} style={{textAlign:'left', borderBottom:'1px solid #E6EEF2', padding:'8px'}}>{c}</th>)}</tr>
                      </thead>
                      <tbody>
                        {preview.headRows.map((row, i) => (
                          <tr key={i}>{row.map((v, j) => <td key={j} style={{borderBottom:'1px solid #F0F4F7', padding:'8px'}}>{String(v ?? '')}</td>)}</tr>
                        ))}
                      </tbody>
                    </Box>
                  ) : <Typography color="text.secondary">CSVを選択すると先頭10行を表示します</Typography>}
                </Box>
              </CardContent></Card>
            )}

            {activeStep === 4 && (
              <Card><CardContent>
                <Typography variant="h2" gutterBottom>実行</Typography>
                <Box sx={{display:'flex', gap:1, flexWrap:'wrap'}}>
                  <Chip label={`ファイル: ${file?.name || '-'}`} />
                  <Chip label={`日付列: ${dateCol || '-'}`} />
                  <Chip label={`値の列: ${valueCol || '-'}`} />
                  <Chip label={`予測期間: ${horizon}日`} />
                </Box>
                <Box sx={{ mt: 2 }}>
                  <Button variant="contained" onClick={runForecast} disabled={!file || !dateCol || !valueCol || busy}>実行</Button>
                </Box>
              </CardContent></Card>
            )}

            <Box sx={{ display:'flex', justifyContent:'space-between', mt:2 }}>
              <Button disabled={activeStep===0} onClick={()=>setActiveStep(s=>Math.max(0, s-1))}>戻る</Button>
              <Button disabled={!canNext()} onClick={()=>setActiveStep(s=>Math.min(4, s+1))}>次へ</Button>
            </Box>
          </Box>
        )}

        {tab === 1 && (
          <Box>
            {/* メインコンテンツエリア：グラフ+メトリクス横並び */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 3, mt: 2 }}>
              {/* 左側：グラフエリア */}
              <Card><CardContent>
                <Typography variant="h2" gutterBottom>予測結果</Typography>
                {result ? (
                  <Plot
                    data={[
                      { x: result.history.map(h=>h.ds), y: result.history.map(h=>h.y), type:'scatter', mode:'lines', name:'実測', line:{color:'#0D1B2A'}},
                      { x: result.forecast.map(f=>f.ds), y: result.forecast.map(f=>f.yhat_lower), type:'scatter', mode:'lines', name:'下限', line:{color:'#BFEFF7'}, showlegend:false },
                      { x: result.forecast.map(f=>f.ds), y: result.forecast.map(f=>f.yhat_upper), type:'scatter', mode:'lines', name:'上限', fill:'tonexty', line:{color:'#BFEFF7'}, fillcolor:'rgba(0,184,217,0.2)', showlegend:false },
                      { x: result.forecast.map(f=>f.ds), y: result.forecast.map(f=>f.yhat), type:'scatter', mode:'lines', name:'予測中央値', line:{color:'#00B8D9'}},
                    ]}
                    layout={{ autosize:true, margin:{l:40,r:20,t:10,b:40} }}
                    style={{ width:'100%', height:360 }}
                    config={{ displayModeBar:false }}
                  />
                ) : <Typography color="text.secondary">まだ実行されていません</Typography>}
              </CardContent></Card>

              {/* 右側：メトリクスエリア */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {/* 基本統計 */}
                {result?.profile && (
                  <Card sx={{ height: 'fit-content' }}><CardContent sx={{ p: 1.5 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontSize: '0.875rem', fontWeight: 600, mb: 1 }}>基本統計</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
                      <Box data-metric="profile.rows" sx={{ p: 0.75, border: highlightedMetrics.includes('profile.rows') ? '2px solid #ff1744' : '1px solid #E6EEF2', borderRadius: 0.5, backgroundColor: highlightedMetrics.includes('profile.rows') ? '#ffebee' : 'transparent', boxShadow: highlightedMetrics.includes('profile.rows') ? '0 0 8px rgba(255, 23, 68, 0.3)' : 'none', transition: 'all 0.3s' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>件数</Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>{result.profile.rows}</Typography>
                      </Box>
                      <Box data-metric="profile.mean" sx={{ p: 0.75, borderRadius: 0.5, backgroundColor: highlightedMetrics.includes('profile.mean') ? '#ffebee' : 'transparent', border: highlightedMetrics.includes('profile.mean') ? '2px solid #ff1744' : '1px solid #E6EEF2', boxShadow: highlightedMetrics.includes('profile.mean') ? '0 0 8px rgba(255, 23, 68, 0.3)' : 'none', transition: 'all 0.3s' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>平均</Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>{result.profile.mean?.toFixed(1)}</Typography>
                      </Box>
                      <Box data-metric="profile.median" sx={{ p: 0.75, borderRadius: 0.5, backgroundColor: highlightedMetrics.includes('profile.median') ? '#ffebee' : 'transparent', border: highlightedMetrics.includes('profile.median') ? '2px solid #ff1744' : '1px solid #E6EEF2', boxShadow: highlightedMetrics.includes('profile.median') ? '0 0 8px rgba(255, 23, 68, 0.3)' : 'none', transition: 'all 0.3s' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>中央値</Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>{result.profile.median?.toFixed(1)}</Typography>
                      </Box>
                      <Box data-metric="profile.cv" sx={{ p: 0.75, borderRadius: 0.5, backgroundColor: highlightedMetrics.includes('profile.cv') ? '#ffebee' : 'transparent', border: highlightedMetrics.includes('profile.cv') ? '2px solid #ff1744' : '1px solid #E6EEF2', boxShadow: highlightedMetrics.includes('profile.cv') ? '0 0 8px rgba(255, 23, 68, 0.3)' : 'none', transition: 'all 0.3s' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>変動係数</Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>{result.profile.cv?.toFixed(2)}</Typography>
                      </Box>
                    </Box>
                  </CardContent></Card>
                )}

                {/* パターン分析 */}
                <Card sx={{ height: 'fit-content' }}><CardContent sx={{ p: 1.5 }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ fontSize: '0.875rem', fontWeight: 600, mb: 1 }}>パターン分析</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
                    {result?.seasonality && (
                      <Box data-metric="seasonality.weekly_strength" sx={{ p: 0.75, borderRadius: 0.5, backgroundColor: highlightedMetrics.includes('seasonality.weekly_strength') ? '#ffebee' : 'transparent', border: highlightedMetrics.includes('seasonality.weekly_strength') ? '2px solid #ff1744' : '1px solid #E6EEF2', boxShadow: highlightedMetrics.includes('seasonality.weekly_strength') ? '0 0 8px rgba(255, 23, 68, 0.3)' : 'none', transition: 'all 0.3s' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>週次季節性</Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>{result.seasonality.weekly_strength}</Typography>
                      </Box>
                    )}
                    {result?.trend && (
                      <Box data-metric="trend.delta_3mo_pct" sx={{ p: 0.75, borderRadius: 0.5, backgroundColor: highlightedMetrics.includes('trend.delta_3mo_pct') ? '#ffebee' : 'transparent', border: highlightedMetrics.includes('trend.delta_3mo_pct') ? '2px solid #ff1744' : '1px solid #E6EEF2', boxShadow: highlightedMetrics.includes('trend.delta_3mo_pct') ? '0 0 8px rgba(255, 23, 68, 0.3)' : 'none', transition: 'all 0.3s' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>3ヶ月変化率</Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem' }} color={result.trend.delta_3mo_pct && result.trend.delta_3mo_pct > 0 ? 'success.main' : 'error.main'}>
                          {result.trend.delta_3mo_pct?.toFixed(1)}%
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent></Card>

                {/* 予測結果 */}
                {result?.forecast_summary && (
                  <Card sx={{ height: 'fit-content' }}><CardContent sx={{ p: 1.5 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontSize: '0.875rem', fontWeight: 600, mb: 1 }}>予測結果</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
                      <Box data-metric="forecast.p50_30" sx={{ p: 0.75, borderRadius: 0.5, backgroundColor: highlightedMetrics.includes('forecast.p50_30') ? '#ffebee' : 'transparent', border: highlightedMetrics.includes('forecast.p50_30') ? '2px solid #ff1744' : '1px solid #E6EEF2', boxShadow: highlightedMetrics.includes('forecast.p50_30') ? '0 0 8px rgba(255, 23, 68, 0.3)' : 'none', transition: 'all 0.3s' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>30日先中央値</Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>{result.forecast_summary.p50_30?.toFixed(1)}</Typography>
                      </Box>
                      <Box data-metric="forecast.delta_30_pct" sx={{ p: 0.75, borderRadius: 0.5, backgroundColor: highlightedMetrics.includes('forecast.delta_30_pct') ? '#ffebee' : 'transparent', border: highlightedMetrics.includes('forecast.delta_30_pct') ? '2px solid #ff1744' : '1px solid #E6EEF2', boxShadow: highlightedMetrics.includes('forecast.delta_30_pct') ? '0 0 8px rgba(255, 23, 68, 0.3)' : 'none', transition: 'all 0.3s' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>最新値比</Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem' }} color={result.forecast_summary.delta_30_pct && result.forecast_summary.delta_30_pct > 0 ? 'success.main' : 'error.main'}>
                          {result.forecast_summary.delta_30_pct?.toFixed(1)}%
                        </Typography>
                      </Box>
                      <Box data-metric="forecast.confidence" sx={{ p: 0.75, borderRadius: 0.5, backgroundColor: highlightedMetrics.includes('forecast.confidence') ? '#ffebee' : 'transparent', border: highlightedMetrics.includes('forecast.confidence') ? '2px solid #ff1744' : '1px solid #E6EEF2', boxShadow: highlightedMetrics.includes('forecast.confidence') ? '0 0 8px rgba(255, 23, 68, 0.3)' : 'none', transition: 'all 0.3s', gridColumn: '1 / -1' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>信頼度</Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>{result.forecast_summary.confidence}</Typography>
                      </Box>
                    </Box>
                  </CardContent></Card>
                )}
              </Box>
            </Box>




            {/* 注意メッセージ */}
            {result?.warnings && result.warnings.length > 0 && (
              <Card sx={{ mt: 2, bgcolor: '#fff3cd', borderLeft: '4px solid #ffc107' }}><CardContent sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem', fontWeight: 600, color: '#856404' }}>⚠️ 注意</Typography>
                <Box sx={{ ml: 1 }}>
                  {result.warnings.map((w, i) => (
                    <Typography key={i} variant="body2" sx={{ color: '#856404', mb: 0.5 }}>• {w}</Typography>
                  ))}
                </Box>
              </CardContent></Card>
            )}
            {/* 詳細レポートモーダル */}
            <Dialog open={summaryModalOpen} onClose={() => setSummaryModalOpen(false)} maxWidth="md" fullWidth>
              <DialogTitle>📄 詳細分析レポート</DialogTitle>
              <DialogContent>
                <Typography variant="h6" gutterBottom>ビジネスサマリー</Typography>
                <Typography sx={{ whiteSpace: 'pre-line', lineHeight: 1.8, mb: 3 }}>
                  {result?.explanations?.business || result?.summaryText || 'レポートを生成中...'}
                </Typography>
                
                <Typography variant="h6" gutterBottom>技術詳細</Typography>
                <Typography sx={{ whiteSpace: 'pre-line', lineHeight: 1.8, fontSize: '0.9rem', color: 'text.secondary' }}>
                  {result?.explanations?.technical || 'Prophet を使用。理由: トレンドと季節性を自動で扱えるため、株価のような時系列データに適しています。'}
                </Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setSummaryModalOpen(false)}>閉じる</Button>
              </DialogActions>
            </Dialog>
          </Box>
        )}
      </Container>

      {/* ギャルゲー風セリフ欄（報告モード時） */}
      {reportMode && result?.narrativeScript && (
        <Box sx={{
          position: 'fixed', bottom: 0, left: 0, right: 0, 
          backgroundColor: 'rgba(0, 0, 0, 0.85)', 
          color: 'white',
          p: 3,
          borderTop: '3px solid #00B8D9',
          zIndex: 1000
        }}>
          <Box sx={{ maxWidth: '800px', margin: '0 auto', display: 'flex', gap: 2, alignItems: 'center', position: 'relative' }}>
            {/* バツボタン */}
            <IconButton 
              sx={{ 
                position: 'absolute', 
                top: -25, 
                right: -50, 
                color: 'white',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.2)' }
              }}
              onClick={() => {
                setReportMode(false)
                setHighlightedMetrics([])
              }}
            >
              <CloseIcon />
            </IconButton>
            {/* AIアイコン */}
            <Box sx={{
              width: 60, height: 60, 
              backgroundColor: '#00B8D9', 
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '24px'
            }}>
              🤖
            </Box>
            
            {/* セリフエリア */}
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ mb: 1, color: '#00B8D9' }}>
                AI アナリスト
              </Typography>
              <Typography sx={{ lineHeight: 1.6, fontSize: '1.1rem' }}>
                {result.narrativeScript[currentScript]?.text || ''}
              </Typography>
            </Box>
            
            {/* コントロールボタン */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button 
                variant="contained" 
                size="small"
                onClick={() => {
                  // 次のスクリプトに進む
                  if (currentScript < result.narrativeScript!.length - 1) {
                    const nextScript = result.narrativeScript![currentScript + 1]
                    setCurrentScript(prev => prev + 1)
                    // 次のスクリプトのハイライトを適用
                    if (nextScript) {
                      setHighlightedMetrics(nextScript.highlight)
                    }
                  } else {
                    // 最後のスクリプト：ハイライトを消す
                    setHighlightedMetrics([])
                  }
                }}
                disabled={currentScript >= (result.narrativeScript?.length || 0)}
              >
                次へ
              </Button>
              <Typography variant="caption" sx={{ color: '#ccc', textAlign: 'center' }}>
                {currentScript + 1} / {result.narrativeScript?.length || 0}
              </Typography>
              <Button 
                variant="outlined" 
                size="small"
                onClick={() => {
                  setCurrentScript(0)
                  // 最初のスクリプトのハイライトを適用
                  const firstScript = result.narrativeScript?.[0]
                  if (firstScript) {
                    setHighlightedMetrics(firstScript.highlight)
                  }
                }}
              >
                最初へ
              </Button>
            </Box>
          </Box>
        </Box>
      )}
    </ThemeProvider>
  )
}



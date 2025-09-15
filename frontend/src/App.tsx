import React, { useMemo, useState } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import { theme } from './theme'
import { AppBar, Box, Button, Card, CardContent, Container, CssBaseline, Divider, LinearProgress, CircularProgress, Tab, Tabs, TextField, Toolbar, Typography, Chip, Dialog, DialogTitle, DialogContent, DialogActions, IconButton } from '@mui/material'
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
  const [methodModalOpen, setMethodModalOpen] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null)
  const progress = useMemo(() => ((activeStep + 1) / steps.length) * 100, [activeStep])

  const analysisMethodsData = {
    'prophet': {
      title: '🔮 Prophet',
      subtitle: 'Meta社が開発した予測モデル',
      description: `時系列のトレンドと季節性を自動で学習する高度なモデルです。

**特徴：**
• 株価や売上など、周期性のあるデータに最適
• 短期の変動と長期傾向を同時に分析
• 祝日効果や外れ値にも自動対応
• Meta社が開発したオープンソース技術

**適用場面：**
• 売上予測、株価分析、需要予測
• ウェブサイトのアクセス数予測
• エネルギー消費量の予測

**メリット：**
• 高い予測精度
• 季節性の自動検出
• 予測区間の不確実性を提供`,
      recommended: true
    },
    'moving_average': {
      title: '📉 移動平均',
      subtitle: 'シンプルで理解しやすい手法',
      description: `データを平滑化してトレンドをわかりやすくする伝統的な手法です。

**特徴：**
• 短期と長期の移動平均を比較可能
• 上昇・下降の傾向を簡単に把握
• 計算がシンプルで理解しやすい
• 金融分析でよく使われる

**適用場面：**
• 株価のテクニカル分析
• 基本的なトレンド分析
• データの平滑化

**注意点：**
• 急な変化には反応が遅い
• 将来予測には限界がある
• 季節性を考慮しない`,
      recommended: false
    },
    'linear_regression': {
      title: '📊 線形回帰',
      subtitle: '基本的な統計分析手法',
      description: `データ全体を直線で近似し、増加傾向や減少傾向を確認する手法です。

**特徴：**
• データ全体の大まかな傾向を把握
• シンプルで理解しやすい
• 統計的な基礎理論に基づく
• 説明変数の影響を定量化可能

**適用場面：**
• 長期的なトレンド分析
• 要因分析（価格と需要の関係など）
• 基本的な予測モデル

**限界：**
• 季節性や非線形な動きは考慮されない
• 複雑なパターンには対応困難
• 外れ値の影響を受けやすい`,
      recommended: false
    },
    'ai_auto': {
      title: '🤖 AIおまかせ',
      subtitle: '最適な手法を自動選択',
      description: `どの手法が最適かわからない場合に、AIが自動で最適な分析手法を選択します。

**特徴：**
• データの特性を自動分析
• 最適な手法を自動選択
• 初心者にも安心
• 専門知識不要

**分析プロセス：**
1. データの基本統計を分析
2. 季節性やトレンドを検出
3. 最適な手法を自動選択
4. 結果を分かりやすく説明

**今回のデモでは：**
Prophet手法を選択するようになっています。実際のシステムでは、データの特性に応じて最適な手法が自動選択されます。`,
      recommended: false
    }
  }

  const openMethodModal = (methodKey: string) => {
    console.log('openMethodModal called with:', methodKey)
    setSelectedMethod(methodKey)
    setMethodModalOpen(true)
    console.log('Modal state set:', { selectedMethod: methodKey, modalOpen: true })
  }

  const adoptMethod = () => {
    setMethodModalOpen(false)
    setActiveStep(3) // データ列設定へ進む
  }

  const onUpload = async (f: File) => {
    setFile(f)
    // quick local preview (first 5 rows) while backend also parses
    Papa.parse(f, {
      header: true,
      preview: 5,
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
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('dateCol', dateCol)
      form.append('valueCol', valueCol)
      form.append('horizonDays', String(horizon))
      const r = await fetch('/api/forecast', { method: 'POST', body: form })
      const json = await r.json() as ForecastResponse
      console.log('Full API Response:', json)
      console.log('Has claude_report?', !!json.explanations?.claude_report)
      setResult(json)
      // 実行完了後に結果タブに切り替え
      setTab(1)
    } catch (e) {
      setResult({ history: [], forecast: [], summaryText: 'エラーが発生しました。', warnings: ['API呼び出しに失敗しました。'] })
      // エラー時も結果タブに切り替え
      setTab(1)
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
                  <Typography variant="body1" gutterBottom>プレビュー（先頭5行）</Typography>
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
                  ) : <Typography color="text.secondary">CSVを選択すると先頭5行を表示します</Typography>}
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
                <Typography gutterBottom color="text.secondary">
                  手法を選択すると詳細説明が表示されます。本デモでは最終的にProphetを使用します。
                </Typography>
                <Box sx={{ display:'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 2, mt: 2 }}>
                  {Object.entries(analysisMethodsData).map(([key, method]) => (
                    <Card
                      key={key}
                      sx={{
                        transition: 'all 0.2s',
                        border: method.recommended ? '2px solid #00B8D9' : '1px solid #E6EEF2',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: 3,
                          borderColor: '#00B8D9'
                        }
                      }}
                    >
                      <CardContent sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="h6" component="div" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                            {method.title}
                          </Typography>
                          {method.recommended && (
                            <Chip label="推奨" size="small" color="primary" sx={{ fontSize: '0.7rem' }} />
                          )}
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                          {method.subtitle}
                        </Typography>
                        <Typography variant="body2" sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          color: 'text.secondary',
                          lineHeight: 1.4
                        }}>
                          {method.description.split('\n')[0]}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="primary"
                          sx={{
                            mt: 1,
                            display: 'block',
                            fontWeight: 500,
                            cursor: 'pointer',
                            '&:hover': { textDecoration: 'underline' }
                          }}
                          onClick={() => {
                            console.log('Clicked method:', key)
                            openMethodModal(key)
                          }}
                        >
                          クリックして詳細を確認 →
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
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
                  <Typography variant="body1" gutterBottom>プレビュー（先頭5行）</Typography>
                  {preview ? (
                    <Box component="table" sx={{ width: '100%', overflowX: 'auto', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          {preview.columns.map(c => {
                            const isDateCol = dateCol === c
                            const isValueCol = valueCol === c
                            const isSelected = isDateCol || isValueCol
                            return (
                              <th
                                key={c}
                                style={{
                                  textAlign: 'left',
                                  borderBottom: '1px solid #E6EEF2',
                                  padding: '8px',
                                  backgroundColor: isSelected ? (isDateCol ? '#e3f2fd' : '#f3e5f5') : 'transparent',
                                  color: isSelected ? (isDateCol ? '#1565c0' : '#7b1fa2') : 'inherit',
                                  fontWeight: isSelected ? 600 : 'normal',
                                  position: 'relative'
                                }}
                              >
                                {c}
                                {isSelected && (
                                  <span style={{
                                    fontSize: '0.7rem',
                                    marginLeft: '4px',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: isDateCol ? '#1565c0' : '#7b1fa2',
                                    color: 'white'
                                  }}>
                                    {isDateCol ? '日付' : '値'}
                                  </span>
                                )}
                              </th>
                            )
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.headRows.map((row, i) => (
                          <tr key={i}>
                            {row.map((v, j) => {
                              const columnName = preview.columns[j]
                              const isDateCol = dateCol === columnName
                              const isValueCol = valueCol === columnName
                              const isSelected = isDateCol || isValueCol
                              return (
                                <td
                                  key={j}
                                  style={{
                                    borderBottom: '1px solid #F0F4F7',
                                    padding: '8px',
                                    backgroundColor: isSelected ? (isDateCol ? '#e3f2fd' : '#f3e5f5') : 'transparent',
                                    color: isSelected ? (isDateCol ? '#1565c0' : '#7b1fa2') : 'inherit',
                                    fontWeight: isSelected ? 500 : 'normal'
                                  }}
                                >
                                  {String(v ?? '')}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </Box>
                  ) : <Typography color="text.secondary">CSVを選択すると先頭5行を表示します</Typography>}
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
                  <Button
                    variant="contained"
                    onClick={runForecast}
                    disabled={!file || !dateCol || !valueCol || busy}
                    sx={{ mr: 2 }}
                  >
                    {busy ? '実行中...' : '実行'}
                  </Button>
                  {busy && (
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={20} />
                      <Typography variant="body2" color="text.secondary">
                        AI分析を実行中です...
                      </Typography>
                    </Box>
                  )}
                </Box>

                {busy && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="body2" gutterBottom color="text.secondary">
                      処理進捗
                    </Typography>
                    <LinearProgress
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: '#f0f4f7',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: '#00B8D9'
                        }
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      データ解析、予測モデル構築、詳細レポート生成を実行中...
                    </Typography>
                  </Box>
                )}
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
                {console.log('Result explanations:', result?.explanations)}
                {result?.explanations?.claude_report ? (
                  <Box sx={{ '& h1, & h2, & h3': { mt: 2, mb: 1 }, '& p': { mb: 1.5, lineHeight: 1.8 }, '& ul, & ol': { mb: 1.5 }, '& li': { mb: 0.5 } }}>
                    <div dangerouslySetInnerHTML={{
                      __html: result.explanations.claude_report
                        .replace(/\n/g, '<br>')
                        .replace(/## (.*?)(<br>|$)/g, '<h2 style="font-size: 1.25rem; font-weight: 600; color: #1976d2; margin-top: 1.5rem; margin-bottom: 0.75rem;">$1</h2>')
                        .replace(/# (.*?)(<br>|$)/g, '<h1 style="font-size: 1.5rem; font-weight: 700; color: #0d47a1; margin-top: 2rem; margin-bottom: 1rem;">$1</h1>')
                        .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 600; color: #1565c0;">$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                        .replace(/^- (.*?)(<br>|$)/gm, '<li style="margin-bottom: 0.25rem;">$1</li>')
                        .replace(/(<li.*?<\/li>)/s, '<ul style="margin-bottom: 1rem; padding-left: 1.5rem;">$1</ul>')
                    }} />
                  </Box>
                ) : (
                  <Box>
                    <Typography variant="h6" gutterBottom>📊 基本レポート</Typography>
                    <Typography sx={{ whiteSpace: 'pre-line', lineHeight: 1.8, mb: 2 }}>
                      {result?.explanations?.business || result?.summaryText || 'レポートを生成中...'}
                    </Typography>

                    {result?.explanations?.technical && (
                      <Typography sx={{ whiteSpace: 'pre-line', lineHeight: 1.8, fontSize: '0.85rem', color: 'text.secondary', mt: 2, fontStyle: 'italic' }}>
                        {result.explanations.technical}
                      </Typography>
                    )}

                    <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                      <Typography variant="body2" color="info.contrastText">
                        💡 より詳細なAI分析レポートを利用するには、ANTHROPIC_API_KEYの設定が必要です。
                      </Typography>
                    </Box>
                  </Box>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setSummaryModalOpen(false)}>閉じる</Button>
              </DialogActions>
            </Dialog>

            {/* 分析手法詳細モーダル */}
            {console.log('Modal render state:', { methodModalOpen, selectedMethod })}
            <Dialog
              open={methodModalOpen}
              onClose={() => {
                console.log('Modal closing')
                setMethodModalOpen(false)
              }}
              maxWidth="md"
              fullWidth
              sx={{ zIndex: 9999 }}
            >
              <DialogTitle>
                テストモーダル - {selectedMethod}
              </DialogTitle>
              <DialogContent>
                <Typography>
                  モーダルが正常に表示されました！選択された手法: {selectedMethod}
                </Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setMethodModalOpen(false)}>
                  閉じる
                </Button>
                <Button variant="contained" onClick={adoptMethod}>
                  この手法を採用
                </Button>
              </DialogActions>
            </Dialog>
          </Box>
        )}
      </Container>

      {/* 分析手法詳細モーダル（Container外に配置） */}
      {console.log('Modal render state (outside):', { methodModalOpen, selectedMethod })}
      <Dialog
        open={methodModalOpen}
        onClose={() => {
          console.log('Modal closing')
          setMethodModalOpen(false)
        }}
        maxWidth="md"
        fullWidth
        sx={{ zIndex: 9999 }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h5" component="div">
              {selectedMethod && analysisMethodsData[selectedMethod as keyof typeof analysisMethodsData]
                ? analysisMethodsData[selectedMethod as keyof typeof analysisMethodsData].title
                : '分析手法詳細'}
            </Typography>
            <IconButton onClick={() => setMethodModalOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
          <Typography variant="subtitle1" color="text.secondary">
            {selectedMethod && analysisMethodsData[selectedMethod as keyof typeof analysisMethodsData]
              ? analysisMethodsData[selectedMethod as keyof typeof analysisMethodsData].subtitle
              : ''}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {selectedMethod && analysisMethodsData[selectedMethod as keyof typeof analysisMethodsData] ? (
            <Box sx={{
              '& h3': { mt: 2, mb: 1, fontWeight: 600, color: '#1565c0' },
              '& p': { mb: 1.5, lineHeight: 1.7 },
              '& ul': { mb: 1.5, pl: 2 },
              '& li': { mb: 0.5 },
              '& strong': { fontWeight: 600, color: '#1565c0' }
            }}>
              <div dangerouslySetInnerHTML={{
                __html: analysisMethodsData[selectedMethod as keyof typeof analysisMethodsData].description
                  .replace(/\n\n/g, '</p><p>')
                  .replace(/\n/g, '<br>')
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/^• (.*?)(<br>|$)/gm, '<li>$1</li>')
                  .replace(/^(\d+)\. (.*?)(<br>|$)/gm, '<li>$2</li>')
                  .replace(/(<li.*?<\/li>)+/gs, (match) => `<ul style="margin-bottom: 1rem; padding-left: 1.5rem;">${match}</ul>`)
                  .replace(/^(.+?)$/s, '<p>$1</p>')
              }} />
            </Box>
          ) : (
            <Typography>データを読み込み中...</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={() => setMethodModalOpen(false)} color="inherit">
            戻る
          </Button>
          <Button
            variant="contained"
            onClick={adoptMethod}
            size="large"
            sx={{ ml: 1, px: 3 }}
          >
            この手法を採用
          </Button>
        </DialogActions>
      </Dialog>

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



import React, { useMemo, useState } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import { theme } from './theme'
import { AppBar, Box, Button, Card, CardContent, Container, CssBaseline, Divider, LinearProgress, Tab, Tabs, TextField, Toolbar, Typography } from '@mui/material'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import Stepper from '@mui/material/Stepper'
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
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="設定" />
          <Tab label="結果" />
        </Tabs>
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
                  style={{ width:'100%', height:480 }}
                  config={{ displayModeBar:false }}
                />
              ) : <Typography color="text.secondary">まだ実行されていません</Typography>}
            </CardContent></Card>

            <Box sx={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:2, mt:2}}>
              <Card><CardContent>
                <Typography variant="h2" gutterBottom>要約</Typography>
                <Typography>{result?.summaryText || '-'}</Typography>
              </CardContent></Card>
              <Card><CardContent>
                <Typography variant="h2" gutterBottom>技術説明</Typography>
                <Typography>Prophet を使用。理由: トレンドと季節性を自動で扱えるため、株価のような時系列データに適しています。</Typography>
              </CardContent></Card>
            </Box>

            <Card sx={{ mt:2 }}><CardContent>
              <Typography variant="h2" gutterBottom>注意</Typography>
              <ul>
                {(result?.warnings || []).map((w, i)=> <li key={i}><Typography>{w}</Typography></li>)}
              </ul>
            </CardContent></Card>
          </Box>
        )}
      </Container>
    </ThemeProvider>
  )
}

import Chip from '@mui/material/Chip'


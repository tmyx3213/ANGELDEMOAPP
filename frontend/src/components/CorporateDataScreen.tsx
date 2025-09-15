import React from 'react'
import { Box, Button, Card, CardContent, Container, Typography, List, ListItem, ListItemIcon, ListItemText, Divider, Chip } from '@mui/material'
import { styled } from '@mui/material/styles'
import StorageIcon from '@mui/icons-material/Storage'
import CloudIcon from '@mui/icons-material/Cloud'
import BusinessIcon from '@mui/icons-material/Business'
import SalesIcon from '@mui/icons-material/TrendingUp'
import ComputerIcon from '@mui/icons-material/Computer'
import FolderIcon from '@mui/icons-material/Folder'

const CorporateContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  paddingTop: theme.spacing(4),
  paddingBottom: theme.spacing(4),
}))

const DataSourceCard = styled(Card)(({ theme }) => ({
  margin: theme.spacing(1, 0),
  transition: 'all 0.3s ease',
  cursor: 'pointer',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
    borderLeft: `4px solid #00B8D9`,
  },
}))

interface CorporateDataScreenProps {
  onBack: () => void
}

export const CorporateDataScreen: React.FC<CorporateDataScreenProps> = ({ onBack }) => {
  const dataSources = [
    {
      id: 'sap',
      name: 'SAPから取得',
      description: '基幹システムからの売上・在庫・顧客データ',
      icon: <BusinessIcon />,
      status: '準備中',
      color: '#2196F3'
    },
    {
      id: 'kinjiro',
      name: '勤次郎から取得',
      description: '勤怠管理システムからの人事・労務データ',
      icon: <StorageIcon />,
      status: '準備中',
      color: '#4CAF50'
    },
    {
      id: 'salesforce',
      name: 'Salesforceから取得',
      description: 'CRMシステムからの営業・顧客管理データ',
      icon: <SalesIcon />,
      status: '準備中',
      color: '#FF9800'
    },
    {
      id: 'aws',
      name: 'AWSから取得',
      description: 'クラウドストレージ・データベースからの各種データ',
      icon: <CloudIcon />,
      status: '準備中',
      color: '#FF5722'
    },
    {
      id: 'local',
      name: 'ローカルから取得',
      description: '社内サーバー・共有フォルダからのファイルデータ',
      icon: <FolderIcon />,
      status: '準備中',
      color: '#9C27B0'
    }
  ]

  const handleDataSourceClick = (source: typeof dataSources[0]) => {
    alert(`${source.name}は現在開発中です。\n\n予定機能：\n${source.description}`)
  }

  return (
    <CorporateContainer>
      <Container maxWidth="md">
        {/* ヘッダー */}
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography
            variant="h3"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 700,
              color: 'white',
              mb: 2,
              textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}
          >
            🏢 社内データ分析
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: 'rgba(255,255,255,0.9)',
              mb: 3,
              textShadow: '0 1px 2px rgba(0,0,0,0.3)'
            }}
          >
            データソースを選択してください
          </Typography>
          <Button
            variant="outlined"
            onClick={onBack}
            sx={{
              color: 'white',
              borderColor: 'rgba(255,255,255,0.5)',
              '&:hover': {
                borderColor: 'white',
                backgroundColor: 'rgba(255,255,255,0.1)'
              }
            }}
          >
            ← 戻る
          </Button>
        </Box>

        {/* データソース一覧 */}
        <Card sx={{
          backgroundColor: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: 3
        }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
              利用可能なデータソース
            </Typography>

            <List sx={{ p: 0 }}>
              {dataSources.map((source, index) => (
                <React.Fragment key={source.id}>
                  <DataSourceCard elevation={1}>
                    <ListItem
                      onClick={() => handleDataSourceClick(source)}
                      sx={{ py: 2.5 }}
                    >
                      <ListItemIcon sx={{ minWidth: 56 }}>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            backgroundColor: source.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white'
                          }}
                        >
                          {source.icon}
                        </Box>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
                              {source.name}
                            </Typography>
                            <Chip
                              label={source.status}
                              size="small"
                              color="warning"
                              sx={{ fontSize: '0.75rem' }}
                            />
                          </Box>
                        }
                        secondary={
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {source.description}
                          </Typography>
                        }
                      />
                      <ComputerIcon sx={{ color: 'text.secondary' }} />
                    </ListItem>
                  </DataSourceCard>
                  {index < dataSources.length - 1 && <Divider sx={{ my: 0.5 }} />}
                </React.Fragment>
              ))}
            </List>

            <Box sx={{ mt: 4, p: 3, backgroundColor: '#f5f5f5', borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ color: '#666', fontWeight: 600 }}>
                💡 開発予定機能
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                • 各データソースへの自動接続<br/>
                • リアルタイムデータ同期<br/>
                • 権限管理・セキュリティ設定<br/>
                • データ変換・前処理の自動化<br/>
                • スケジュール実行・定期レポート生成
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </CorporateContainer>
  )
}
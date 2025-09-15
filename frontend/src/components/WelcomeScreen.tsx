import React from 'react'
import { Box, Button, Card, CardContent, Container, Typography, Fade, Grow } from '@mui/material'
import { styled } from '@mui/material/styles'

const WelcomeContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 0%, transparent 50%),
                      radial-gradient(circle at 75% 75%, rgba(255,255,255,0.1) 0%, transparent 50%)`,
    pointerEvents: 'none',
  },
}))

const WelcomeCard = styled(Card)(({ theme }) => ({
  maxWidth: 600,
  backdropFilter: 'blur(20px)',
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  borderRadius: 24,
  border: '1px solid rgba(255, 255, 255, 0.2)',
}))

const AppIcon = styled(Box)(({ theme }) => ({
  width: 120,
  height: 120,
  background: 'linear-gradient(135deg, #00B8D9 0%, #0086A3 100%)',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '48px',
  margin: '0 auto 24px',
  boxShadow: '0 10px 30px rgba(0, 184, 217, 0.4)',
  animation: 'pulse 2s ease-in-out infinite',
  '@keyframes pulse': {
    '0%': {
      transform: 'scale(1)',
      boxShadow: '0 10px 30px rgba(0, 184, 217, 0.4)',
    },
    '50%': {
      transform: 'scale(1.05)',
      boxShadow: '0 15px 40px rgba(0, 184, 217, 0.6)',
    },
    '100%': {
      transform: 'scale(1)',
      boxShadow: '0 10px 30px rgba(0, 184, 217, 0.4)',
    },
  },
}))

interface WelcomeScreenProps {
  onPersonalStart: () => void
  onCorporateStart: () => void
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onPersonalStart, onCorporateStart }) => {
  return (
    <WelcomeContainer>
      <Container maxWidth="sm">
        <Fade in timeout={800}>
          <WelcomeCard>
            <CardContent sx={{ p: 5, textAlign: 'center' }}>
              <Grow in timeout={1000}>
                <AppIcon>
                  📊
                </AppIcon>
              </Grow>

              <Fade in timeout={1200}>
                <Typography
                  variant="h3"
                  component="h1"
                  gutterBottom
                  sx={{
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    mb: 2
                  }}
                >
                  自然言語データ分析
                </Typography>
              </Fade>

              <Fade in timeout={1400}>
                <Typography
                  variant="h6"
                  color="text.secondary"
                  gutterBottom
                  sx={{ mb: 3, fontWeight: 400 }}
                >
                  MVP Version 2.0
                </Typography>
              </Fade>

              <Fade in timeout={1600}>
                <Box sx={{ mb: 4 }}>
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{
                      lineHeight: 1.8,
                      fontSize: '1.1rem'
                    }}
                  >
                    統計や機械学習の知識がなくても、<br />
                    自然言語のガイドに従って<br />
                    データ分析を始められます。
                  </Typography>
                </Box>
              </Fade>

              <Fade in timeout={1800}>
                <Box sx={{ mb: 3 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    ✨ 特徴
                  </Typography>
                  <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 1,
                    textAlign: 'left'
                  }}>
                    <Typography variant="body2" color="text.secondary">
                      📈 時系列データ分析
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      🔮 Prophet予測モデル
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      📊 視覚的レポート
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      🎭 対話的説明
                    </Typography>
                  </Box>
                </Box>
              </Fade>

              <Fade in timeout={2000}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={onPersonalStart}
                    sx={{
                      px: 4,
                      py: 1.5,
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      borderRadius: 3,
                      background: 'linear-gradient(135deg, #00B8D9 0%, #0086A3 100%)',
                      boxShadow: '0 8px 25px rgba(0, 184, 217, 0.4)',
                      minWidth: 200,
                      '&:hover': {
                        background: 'linear-gradient(135deg, #0086A3 0%, #006B7A 100%)',
                        boxShadow: '0 12px 35px rgba(0, 184, 217, 0.6)',
                        transform: 'translateY(-2px)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    👤 個人でデータ分析
                  </Button>

                  <Button
                    variant="outlined"
                    size="large"
                    onClick={onCorporateStart}
                    sx={{
                      px: 4,
                      py: 1.5,
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      borderRadius: 3,
                      minWidth: 200,
                      border: '2px solid #00B8D9',
                      color: '#00B8D9',
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      '&:hover': {
                        backgroundColor: '#00B8D9',
                        color: 'white',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 25px rgba(0, 184, 217, 0.4)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    🏢 社内のデータ分析
                  </Button>

                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 1, textAlign: 'center' }}
                  >
                    個人: CSVファイルをアップロード<br />
                    社内: データベース連携（準備中）
                  </Typography>
                </Box>
              </Fade>

              <Fade in timeout={2200}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    mt: 3,
                    display: 'block',
                    fontStyle: 'italic'
                  }}
                >
                  Powered by Prophet & Claude AI
                </Typography>
              </Fade>
            </CardContent>
          </WelcomeCard>
        </Fade>
      </Container>
    </WelcomeContainer>
  )
}
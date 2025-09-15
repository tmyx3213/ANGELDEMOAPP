import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#00B8D9', dark: '#0093AD', contrastText: '#FFFFFF' },
    secondary: { main: '#0D1B2A', contrastText: '#FFFFFF' },
    background: { default: '#FFFFFF', paper: '#F7FBFD' },
    warning: { main: '#F59E0B' },
    error: { main: '#EF4444' },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', borderRadius: 8 },
      }
    },
    MuiCard: {
      styleOverrides: {
        root: { borderTop: '2px solid #00B8D9', boxShadow: '0 4px 12px rgba(13,27,42,0.06)' }
      }
    }
  },
  typography: {
    h1: { fontSize: 24, fontWeight: 600 },
    h2: { fontSize: 20, fontWeight: 600 },
    body1: { fontSize: 14 },
    caption: { fontSize: 12 },
  }
})


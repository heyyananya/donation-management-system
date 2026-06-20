import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#0F766E', light: '#14B8A6', dark: '#0B5751', contrastText: '#fff' },
    secondary: { main: '#14B8A6', contrastText: '#fff' },
    background: { default: '#F8FAFC', paper: '#FFFFFF' },
    text: { primary: '#1E293B', secondary: '#475569' },
    divider: '#E2E8F0',
  },
  typography: {
    fontFamily: '"Inter", system-ui, sans-serif',
    h4: { fontWeight: 700, letterSpacing: -0.3 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid #E2E8F0',
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 10, paddingInline: 18 } },
    },
    MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
    MuiTableCell: { styleOverrides: { head: { fontWeight: 700, background: '#F1F5F9' } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
  },
});
